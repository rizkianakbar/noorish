import { isIos } from '#/features/pwa/pwa.lib.ts';
import { messagesFor } from '#/lib/i18n.ts';
import { prefsStore } from '#/lib/prefs.ts';
import { dateKey } from '#/lib/progress.ts';
import {
  cancelPrayerPushFn,
  getPushKeyFn,
  removePushSubscriptionFn,
  savePushScheduleFn,
} from '#/server/push.functions.ts';
import type { PushPayload } from '#/server/schemas.ts';
import { ARABIC_NAMES, shiftDay, upcomingPrayers } from './prayer.lib.ts';
import { markPrayed, prayerLogStore, prayerStore, setPrayerSetting } from './prayer.store.ts';
import type { Place, PrayerLog, PrayerSettings } from './prayer.types.ts';

/**
 * Prayer notifications over Web Push, so they arrive with the app closed.
 * The device works out the next two weeks of prayer times and hands the
 * server only the ready-made notifications (see `pushSchedule` in the
 * schema): the location stays here. Loaded on demand, once notifications
 * are on (see `usePrayerPush`).
 */

const DAYS = 14;
/**
 * Re-sent at least this often, so the two weeks never run out for a reader
 * who keeps opening the app.
 */
const RESYNC_MS = 3 * 24 * 3_600_000;
/**
 * The "time is running out" nudge comes this long before a prayer's time
 * is over, if the window is long enough to be worth it.
 */
const LAST_CALL_MINUTES = 20;
const MIN_WINDOW_MINUTES = 45;
const SYNC_KEY = 'quran:prayer-push';
// Kept in step with `pwa.sw.js`.
const PRAYED_INBOX = 'noorish-prayed';

export type PushSupport = 'supported' | 'install' | 'unsupported';

/**
 * Whether this browser can get push: iPhone and iPad only from the Home
 * Screen app, so a Safari tab there is told to install.
 */
export function pushSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) return 'supported';
  return isIos() ? 'install' : 'unsupported';
}

function urlBase64ToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * The notifications for the next two weeks, in the reader's language and the
 * place's time. Prayers already logged get none.
 */
export function buildSchedule(place: Place, settings: PrayerSettings, log: PrayerLog, now: Date) {
  const { language } = prefsStore.get();
  const t = messagesFor(language);
  const time = new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', timeZone: place.timezone });
  const items: { sendAt: string; payload: PushPayload }[] = [];

  for (const prayer of upcomingPrayers(place, settings, now, DAYS)) {
    if (log[prayer.key]) continue;
    const name = t.prayerNames[prayer.name];
    const base = { prayer: prayer.key, action: t.pushPrayed, lang: language };
    items.push({
      sendAt: prayer.start.toISOString(),
      payload: {
        ...base,
        title: `${name} · ${ARABIC_NAMES[prayer.name]}`,
        body: t.pushAdhanBody(prayer.name, time.format(prayer.start), time.format(prayer.end)),
      },
    });

    const minutes = (prayer.end.getTime() - prayer.start.getTime()) / 60_000;
    // Isha runs to Fajr: a nudge before dawn would wake the reader for nothing.
    if (settings.lastCall && prayer.name !== 'isha' && minutes >= MIN_WINDOW_MINUTES) {
      items.push({
        sendAt: new Date(prayer.end.getTime() - LAST_CALL_MINUTES * 60_000).toISOString(),
        payload: { ...base, title: t.pushLastCallTitle(name, LAST_CALL_MINUTES), body: t.pushLastCallBody },
      });
    }
  }
  return items;
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

function readSync(): { signature: string; at: number } | null {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeSync(value: { signature: string; at: number } | null) {
  try {
    if (value) localStorage.setItem(SYNC_KEY, JSON.stringify(value));
    else localStorage.removeItem(SYNC_KEY);
  } catch {
    // Storage blocked: the schedule is just sent again next time.
  }
}

/**
 * Send this device's schedule, unless the one the server has is still
 * right: same subscription, place, settings and language, and recent.
 */
async function sync(opts: { force?: boolean } = {}) {
  const settings = prayerStore.get();
  if (!settings.notify || !settings.place || Notification.permission !== 'granted') return;

  let subscription = await currentSubscription();
  // The browser can drop or rotate a subscription; quietly make a new one.
  if (!subscription) subscription = await subscribe();
  if (!subscription) return;

  const { place, method, madhab, lastCall } = settings;
  const signature = JSON.stringify([subscription.endpoint, place, method, madhab, lastCall, prefsStore.get().language]);
  const last = readSync();
  if (!opts.force && last?.signature === signature && Date.now() - last.at < RESYNC_MS) return;

  const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const items = buildSchedule(place, settings, prayerLogStore.get(), new Date());
  await savePushScheduleFn({ data: { subscription: { endpoint: json.endpoint, keys: json.keys }, items } });
  writeSync({ signature, at: Date.now() });
}

async function subscribe() {
  const key = await getPushKeyFn();
  if (!key) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(key) });
}

export type EnableResult = 'on' | 'denied' | 'unavailable';

/**
 * Turn notifications on, from a tap (browsers ask permission only then).
 */
export async function enablePush(): Promise<EnableResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  if (!(await subscribe().catch(() => null))) return 'unavailable';
  setPrayerSetting('notify', true);
  await sync({ force: true });
  return 'on';
}

export async function disablePush() {
  setPrayerSetting('notify', false);
  writeSync(null);
  const subscription = await currentSubscription().catch(() => null);
  if (!subscription) return;
  await removePushSubscriptionFn({ data: { endpoint: subscription.endpoint } }).catch(() => {});
  await subscription.unsubscribe();
}

let draining = false;

/**
 * Log the prayers marked from a notification while the app was closed.
 */
async function drainInbox() {
  const inbox = await caches.open(PRAYED_INBOX);
  draining = true;
  for (const request of await inbox.keys()) {
    markPrayed(decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? ''));
    await inbox.delete(request);
  }
  draining = false;
}

let started = false;

/**
 * Keep notifications in step with the app: resync when the place, settings
 * or language change; cancel a prayer's nudge once it's logged here; take in
 * prayers logged from a notification.
 */
export function startPrayerPush() {
  if (started || pushSupport() !== 'supported') return;
  started = true;

  const resync = () => void sync().catch(() => {});
  prayerStore.subscribe(resync);
  prefsStore.subscribe(resync);

  let logged = prayerLogStore.get();
  prayerLogStore.subscribe(() => {
    const next = prayerLogStore.get();
    // Only prayers that can still have a notification waiting, not ones
    // ticked days later in the history.
    const since = shiftDay(dateKey(new Date()), -1);
    const added = Object.keys(next).filter((key) => !logged[key] && key >= since);
    logged = next;
    // Logged from a notification: the service worker has told the server.
    if (draining || !added.length || !prayerStore.get().notify) return;
    void currentSubscription().then((subscription) => {
      if (!subscription) return;
      for (const prayer of added) void cancelPrayerPushFn({ data: { endpoint: subscription.endpoint, prayer } });
    });
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PRAYED') void drainInbox();
  });
  void drainInbox()
    .catch(() => {})
    .then(resync);
}
