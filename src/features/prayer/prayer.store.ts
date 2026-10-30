import { dateKey } from '#/lib/progress.ts';
import { createStore } from '#/lib/store.ts';
import type { ReminderState } from './prayer.lib.ts';
import { shiftDay } from './prayer.lib.ts';
import type { PrayerLog, PrayerSettings } from './prayer.types.ts';

/**
 * Where and how prayer times are worked out. Kept on this device only: a
 * location is personal, and it is only ever used here, in the browser.
 */
export const prayerStore = createStore<PrayerSettings>(
  { place: null, method: 'auto', madhab: 'shafi', reminders: true, notify: false, lastCall: true },
  { key: 'quran:prayer' },
);

/**
 * A prayer the reminder was asked to bring up later, on this device.
 */
export const reminderStore = createStore<ReminderState>({ snooze: null }, { key: 'quran:prayer-answers' });

/**
 * The prayers the reader logged (see `PrayerLog`), on this device. Logged
 * from the in-app reminder, a notification's "I've prayed", or the history.
 */
export const prayerLogStore = createStore<PrayerLog>({}, { key: 'quran:prayer-log' });

/**
 * A year and a bit: enough for every streak worth showing, ~25 KB at most.
 */
const KEEP_DAYS = 400;

function prune(log: PrayerLog): PrayerLog {
  const cutoff = shiftDay(dateKey(new Date()), -KEEP_DAYS);
  return Object.fromEntries(Object.entries(log).filter(([key]) => key >= cutoff));
}

export function markPrayed(key: string) {
  if (prayerLogStore.get()[key]) return;
  prayerLogStore.set((prev) => prune({ ...prev, [key]: Date.now() }));
  reminderStore.set({ snooze: null });
}

export function unmarkPrayed(key: string) {
  prayerLogStore.set(({ [key]: _, ...rest }) => rest);
}

export function snoozeReminder(id: string, minutes: number) {
  reminderStore.set({ snooze: { id, until: Date.now() + minutes * 60_000 } });
}

export function setPrayerSetting<K extends keyof PrayerSettings>(key: K, value: PrayerSettings[K]) {
  prayerStore.set((prev) => ({ ...prev, [key]: value }));
}

// The reminder used to keep its last ten answers as `name@start`; carry
// them into the log so the history starts with them.
if (typeof window !== 'undefined') {
  const legacy = (reminderStore.get() as ReminderState & { answered?: string[] }).answered;
  const zone = prayerStore.get().place?.timezone;
  if (legacy) {
    const migrated: PrayerLog = {};
    for (const id of zone ? legacy : []) {
      const [name, start] = id.split('@');
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(start));
      migrated[`${day}:${name}`] = new Date(start).getTime();
    }
    prayerLogStore.set((prev) => ({ ...migrated, ...prev }));
    reminderStore.set(({ snooze }) => ({ snooze }));
  }
}
