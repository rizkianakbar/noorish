import { describe, expect, it } from 'vitest';
import { prefsStore } from '#/lib/prefs.ts';
import { prayerDay } from './prayer.lib.ts';
import { buildSchedule } from './prayer.push.ts';
import type { Place, PrayerSettings } from './prayer.types.ts';

const JAKARTA: Place = { name: 'Jakarta', lat: -6.2, lng: 106.85, timezone: 'Asia/Jakarta', country: 'ID' };
const SETTINGS: PrayerSettings = {
  place: JAKARTA,
  method: 'auto',
  madhab: 'shafi',
  reminders: true,
  notify: true,
  lastCall: true,
};

describe('buildSchedule', () => {
  prefsStore.set((prev) => ({ ...prev, language: 'en' }));
  const day = prayerDay(JAKARTA, SETTINGS, new Date('2026-10-23T03:00:00Z'));
  // Ten minutes into Asr on 23 October.
  const now = new Date(day.times.asr.getTime() + 10 * 60_000);
  const asr = (items: ReturnType<typeof buildSchedule>) =>
    items.filter((item) => item.payload.prayer === '2026-10-23:asr').map((item) => item.payload.title);

  it('keeps the running prayer’s nudge, not its adhan, which has passed', () => {
    expect(asr(buildSchedule(JAKARTA, SETTINGS, {}, null, now))).toEqual(['Asr ends in 20 min']);
  });

  it('adds the reminder asked for, with the time left then', () => {
    const until = now.getTime() + 30 * 60_000;
    const items = buildSchedule(JAKARTA, SETTINGS, {}, { id: '2026-10-23:asr', until }, now);
    const reminder = items.find((item) => item.payload.title === 'Asr: your reminder');
    expect(reminder?.sendAt).toBe(new Date(until).toISOString());
    expect(reminder?.payload.body).toMatch(/There’s \d+ h \d+ min left|There’s \d+ min left/);
  });

  it('drops a reminder past the prayer’s end, and everything once it’s logged', () => {
    const late = { id: '2026-10-23:asr', until: day.times.maghrib.getTime() + 60_000 };
    expect(asr(buildSchedule(JAKARTA, SETTINGS, {}, late, now))).toEqual(['Asr ends in 20 min']);
    const until = now.getTime() + 10 * 60_000;
    const logged = buildSchedule(JAKARTA, SETTINGS, { '2026-10-23:asr': 1 }, { id: '2026-10-23:asr', until }, now);
    expect(asr(logged)).toEqual([]);
  });
});
