import { eq } from 'drizzle-orm';
import { describe, expect } from 'vitest';
import { pushSchedule, pushSubscriptions } from '#/db/schema.ts';
import { serverTest } from '#/test/database.ts';
import {
  cancelPrayerPush,
  removePushSubscription,
  replacePrayerPush,
  type SendPush,
  savePushSchedule,
  sendDuePush,
} from './push.server.ts';
import type { PushPayload } from './schemas.ts';

// Far in the past, so the real schedule rows in the dev database are never
// due in these tests.
const NOW = new Date('2001-01-01T12:00:00Z');
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();

function subscription() {
  return { endpoint: `https://push.example/${crypto.randomUUID()}`, keys: { p256dh: 'BKey', auth: 'auth' } };
}

function item(minutes: number, prayer = '2001-01-01:asr'): { sendAt: string; payload: PushPayload } {
  return { sendAt: at(minutes), payload: { title: 'Asr', body: '', prayer, action: 'I’ve prayed', lang: 'en' } };
}

function recorder(outcome: 'sent' | 'gone' = 'sent') {
  const sent: string[] = [];
  const send: SendPush = async (sub, payload) => {
    sent.push(`${sub.endpoint} ${payload.prayer} ${payload.title}`);
    return outcome;
  };
  return { sent, send };
}

describe('push schedule', () => {
  serverTest('replaces a device’s schedule, keeping only the two-week window', async ({ db }) => {
    const sub = subscription();
    await savePushSchedule(db, sub, [item(5), item(10)], NOW);
    const saved = await savePushSchedule(db, sub, [item(20), item(-60), item(60 * 24 * 30)], NOW);

    expect(saved).toBe(1);
    const rows = await db
      .select()
      .from(pushSchedule)
      .innerJoin(pushSubscriptions, eq(pushSchedule.subscriptionId, pushSubscriptions.id))
      .where(eq(pushSubscriptions.endpoint, sub.endpoint));
    expect(rows.map((r) => new Date(r.quran_push_schedule.sendAt).toISOString())).toEqual([at(20)]);
  });

  serverTest('sends what is due once, drops what is stale, keeps the rest', async ({ db }) => {
    const sub = subscription();
    await savePushSchedule(db, sub, [item(0, '2001-01-01:dhuhr'), item(2), item(30)], NOW);
    const { sent, send } = recorder();

    // Eleven minutes on: the 12:00 one is stale, the 12:02 one is still due.
    const later = new Date(NOW.getTime() + 11 * 60_000);
    expect(await sendDuePush(db, later, send)).toEqual({ sent: 1, failed: 0, gone: 0, dropped: 1 });
    expect(sent).toEqual([`${sub.endpoint} 2001-01-01:asr Asr`]);
    // Claimed rows are gone: a second run sends nothing.
    expect((await sendDuePush(db, later, send)).sent).toBe(0);
    expect(sent).toHaveLength(1);
  });

  serverTest('forgets a subscription the push service no longer knows', async ({ db }) => {
    const sub = subscription();
    await savePushSchedule(db, sub, [item(0), item(30)], NOW);

    expect((await sendDuePush(db, NOW, recorder('gone').send)).gone).toBe(1);
    expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint))).toEqual([]);
  });

  serverTest('cancels what is left for a prayer once it is logged', async ({ db }) => {
    const sub = subscription();
    const other = subscription();
    await savePushSchedule(db, sub, [item(5), item(30), item(60, '2001-01-01:maghrib')], NOW);
    await savePushSchedule(db, other, [item(58)], NOW);

    await cancelPrayerPush(db, sub.endpoint, '2001-01-01:asr');

    const { sent, send } = recorder();
    await sendDuePush(db, new Date(NOW.getTime() + 61 * 60_000), send);
    // The other device's Asr is untouched.
    expect(sent.sort()).toEqual(
      [`${other.endpoint} 2001-01-01:asr Asr`, `${sub.endpoint} 2001-01-01:maghrib Asr`].sort(),
    );
  });

  serverTest('removing a device removes its schedule', async ({ db }) => {
    const sub = subscription();
    await savePushSchedule(db, sub, [item(5)], NOW);
    await removePushSubscription(db, sub.endpoint);

    const { sent, send } = recorder();
    await sendDuePush(db, new Date(NOW.getTime() + 10 * 60_000), send);
    expect(sent).toEqual([]);
  });

  serverTest('replaces one prayer’s notifications, leaving the rest', async ({ db }) => {
    const sub = subscription();
    await savePushSchedule(db, sub, [item(5), item(8, '2001-01-01:maghrib')], NOW);

    // "Remind me in 3 min" for Asr: its old item goes, the new one and Maghrib stay.
    const asr = { ...item(3), payload: { ...item(3).payload, title: 'Asr: your reminder' } };
    expect(await replacePrayerPush(db, sub.endpoint, '2001-01-01:asr', [asr, item(4, '2001-01-01:isha')], NOW)).toBe(1);

    const { sent, send } = recorder();
    await sendDuePush(db, new Date(NOW.getTime() + 9 * 60_000), send);
    expect(sent.sort()).toEqual(
      [`${sub.endpoint} 2001-01-01:asr Asr: your reminder`, `${sub.endpoint} 2001-01-01:maghrib Asr`].sort(),
    );
    // An unknown device changes nothing.
    expect(await replacePrayerPush(db, 'https://push.example/unknown', '2001-01-01:asr', [asr], NOW)).toBe(0);
  });
});
