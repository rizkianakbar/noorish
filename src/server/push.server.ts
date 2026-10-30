import { and, eq, inArray, lte } from 'drizzle-orm';
import webpush from 'web-push';
import { pushSchedule, pushSubscriptions } from '#/db/schema.ts';
import type { Database } from './db.server.ts';
import { env } from './env.server.ts';
import type { PushPayload, PushSubscriptionInput } from './schemas.ts';

/**
 * How far ahead a device may schedule, with a day's slack on the two weeks
 * it sends.
 */
const HORIZON_MS = 15 * 24 * 3_600_000;
/**
 * A notification this late (the scheduler was down) is dropped, not sent:
 * an adhan an hour after the fact is noise.
 */
const STALE_MS = 10 * 60_000;

export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

/**
 * Replace a device's schedule with the one it just worked out. Items
 * outside the window are ignored rather than trusted.
 */
export async function savePushSchedule(
  db: Database,
  subscription: PushSubscriptionInput,
  items: { sendAt: string; payload: PushPayload }[],
  now = new Date(),
) {
  const keys = { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, updatedAt: now.toISOString() };
  const due = items.filter(({ sendAt }) => {
    const at = new Date(sendAt).getTime() - now.getTime();
    return at > -STALE_MS && at < HORIZON_MS;
  });

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(pushSubscriptions)
      .values({ endpoint: subscription.endpoint, ...keys })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: keys })
      .returning({ id: pushSubscriptions.id });
    await tx.delete(pushSchedule).where(eq(pushSchedule.subscriptionId, row.id));
    if (due.length) {
      await tx
        .insert(pushSchedule)
        .values(due.map((item) => ({ subscriptionId: row.id, prayer: item.payload.prayer, ...item })));
    }
    return due.length;
  });
}

/**
 * Stop notifying a device. Its schedule goes with it.
 */
export async function removePushSubscription(db: Database, endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * The reader logged this prayer: drop what's left for it (the "time is
 * running out" nudge).
 */
export async function cancelPrayerPush(db: Database, endpoint: string, prayer: string) {
  const subscription = db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  await db
    .delete(pushSchedule)
    .where(and(inArray(pushSchedule.subscriptionId, subscription), eq(pushSchedule.prayer, prayer)));
}

export type SendPush = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
) => Promise<'sent' | 'gone'>;

/**
 * Web Push with this server's VAPID keys. `gone` when the push service no
 * longer knows the subscription (the reader revoked it or uninstalled).
 */
const sendWebPush: SendPush = async (subscription, payload) => {
  try {
    // Urgent: an adhan should wake an idle phone; TTL past which it is stale.
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: STALE_MS / 1000,
      urgency: 'high',
      topic: payload.prayer.replace(/\W/g, ''),
    });
    return 'sent';
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'gone';
    throw error;
  }
};

/**
 * Send everything due. Claims the rows by deleting them in one statement,
 * so overlapping runs never send twice; late ones are dropped unsent.
 * Subscriptions the push service has forgotten are removed.
 */
export async function sendDuePush(db: Database, now = new Date(), send: SendPush = sendWebPush) {
  const claimed = await db.delete(pushSchedule).where(lte(pushSchedule.sendAt, now.toISOString())).returning({
    subscriptionId: pushSchedule.subscriptionId,
    sendAt: pushSchedule.sendAt,
    payload: pushSchedule.payload,
  });
  const fresh = claimed.filter((item) => now.getTime() - new Date(item.sendAt).getTime() < STALE_MS);
  if (!fresh.length) return { sent: 0, failed: 0, gone: 0, dropped: claimed.length };

  const ids = [...new Set(fresh.map((item) => item.subscriptionId))];
  const subscriptions = new Map(
    (await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.id, ids))).map((s) => [s.id, s]),
  );

  const gone = new Set<string>();
  const results = await Promise.allSettled(
    fresh.map(async (item) => {
      const sub = subscriptions.get(item.subscriptionId);
      if (!sub) return 'gone';
      const outcome = await send(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        item.payload,
      );
      if (outcome === 'gone') gone.add(sub.id);
      return outcome;
    }),
  );
  if (gone.size) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, [...gone]));

  const count = (test: (r: (typeof results)[number]) => boolean) => results.filter(test).length;
  return {
    sent: count((r) => r.status === 'fulfilled' && r.value === 'sent'),
    failed: count((r) => r.status === 'rejected'),
    gone: gone.size,
    dropped: claimed.length - fresh.length,
  };
}
