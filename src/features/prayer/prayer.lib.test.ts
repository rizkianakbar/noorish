import { describe, expect, it } from 'vitest';
import {
  compassPoint,
  kaabaDistanceKm,
  methodFor,
  PRAYERS,
  prayerDay,
  prayerHistory,
  prayerKey,
  prayerStreak,
  qiblaBearing,
  reminderDue,
  SALAH,
  shiftDay,
  todayIn,
  turnBetween,
  upcomingPrayers,
} from './prayer.lib.ts';
import type { Place, PrayerLog, PrayerSettings } from './prayer.types.ts';

const JAKARTA: Place = { name: 'Jakarta', lat: -6.2, lng: 106.85, timezone: 'Asia/Jakarta', country: 'ID' };
const LONDON: Place = { name: 'London', lat: 51.51, lng: -0.13, timezone: 'Europe/London', country: 'GB' };
const AUTO: PrayerSettings = {
  place: null,
  method: 'auto',
  madhab: 'shafi',
  reminders: true,
  notify: false,
  lastCall: true,
};

function hhmm(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(date);
}

describe('methodFor', () => {
  it("uses the place's country unless the reader chose a method", () => {
    expect(methodFor(AUTO, JAKARTA)).toBe('kemenag');
    expect(methodFor(AUTO, { ...JAKARTA, country: 'FR' })).toBe('mwl');
    expect(methodFor({ ...AUTO, method: 'isna' }, JAKARTA)).toBe('isna');
  });
});

describe('prayerDay', () => {
  // 10:00 in Jakarta (UTC+7) on 23 October 2026.
  const morning = new Date('2026-10-23T03:00:00Z');

  it('gives the six times in order, on the right day in the place’s zone', () => {
    const { times } = prayerDay(JAKARTA, AUTO, morning);
    const instants = PRAYERS.map((p) => times[p].getTime());
    expect(instants).toEqual([...instants].sort((a, b) => a - b));
    // Jakarta is near the equator: Fajr around 04:00, Maghrib around 18:00 all year.
    expect(hhmm(times.fajr, JAKARTA.timezone)).toMatch(/^04:/);
    expect(hhmm(times.maghrib, JAKARTA.timezone)).toMatch(/^1[78]:/);
  });

  it('names Dhuhr as next mid-morning, with no prayer current after sunrise', () => {
    const day = prayerDay(JAKARTA, AUTO, morning);
    expect(day.next.name).toBe('dhuhr');
    expect(day.current).toBeNull();
  });

  it("rolls over to tomorrow's Fajr after Isha", () => {
    // 23:00 in Jakarta.
    const night = new Date('2026-10-23T16:00:00Z');
    const day = prayerDay(JAKARTA, AUTO, night);
    expect(day.current).toBe('isha');
    expect(day.next.name).toBe('fajr');
    expect(day.next.at.getTime()).toBeGreaterThan(night.getTime());
  });

  it('works out the day in the place’s zone, not the device’s', () => {
    // Already the 24th in Jakarta, still the 23rd in London.
    const instant = new Date('2026-10-23T22:00:00Z');
    const jakartaFajr = prayerDay(JAKARTA, AUTO, instant).times.fajr;
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(jakartaFajr)).toBe('2026-10-24');
  });

  it('puts Hanafi Asr later than the standard one', () => {
    const standard = prayerDay(LONDON, AUTO, morning).times.asr;
    const hanafi = prayerDay(LONDON, { ...AUTO, madhab: 'hanafi' }, morning).times.asr;
    expect(hanafi.getTime()).toBeGreaterThan(standard.getTime());
  });
});

describe('qibla', () => {
  it('matches well-known bearings', () => {
    expect(qiblaBearing(JAKARTA)).toBeCloseTo(295, 0);
    expect(qiblaBearing({ lat: 40.71, lng: -74.01 })).toBeCloseTo(58.5, 0);
    expect(qiblaBearing(LONDON)).toBeCloseTo(119, 0);
  });

  it('measures the distance to the Kaaba', () => {
    expect(kaabaDistanceKm(JAKARTA)).toBeGreaterThan(7800);
    expect(kaabaDistanceKm(JAKARTA)).toBeLessThan(8000);
  });

  it('names compass points and turns the short way', () => {
    expect(compassPoint(295)).toBe('NW');
    expect(compassPoint(359)).toBe('N');
    expect(turnBetween(350, 10)).toBe(20);
    expect(turnBetween(10, 350)).toBe(-20);
  });
});

describe('reminderDue', () => {
  const none = { snooze: null };
  /** Answer whatever is asked at `at`, as the reader tapping "Sudah". */
  const answer = (log: PrayerLog, at: Date): PrayerLog => {
    const due = reminderDue(prayerDay(JAKARTA, AUTO, at), at, none, log);
    return due ? { ...log, [due.id]: at.getTime() } : log;
  };
  const askedAt = (log: PrayerLog, at: Date) =>
    reminderDue(prayerDay(JAKARTA, AUTO, at), at, none, log)?.prayer ?? null;
  // Ten minutes into each of 23 October's prayers in Jakarta.
  const day = prayerDay(JAKARTA, AUTO, new Date('2026-10-23T03:00:00Z'));
  const into = (name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') =>
    new Date(day.times[name].getTime() + 10 * 60_000);

  it('asks once at every adhan, five times a day, even after each is answered', () => {
    let log: PrayerLog = {};
    const asked: (string | null)[] = [];
    for (const name of SALAH) {
      asked.push(askedAt(log, into(name)));
      log = answer(log, into(name));
      // Answered: not asked again within the same prayer's time.
      expect(askedAt(log, new Date(into(name).getTime() + 5 * 60_000))).toBeNull();
    }
    expect(asked).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
    expect(Object.keys(log)).toEqual(SALAH.map((name) => prayerKey('2026-10-23', name)));
  });

  it('counts each prayer’s time to the next adhan, Fajr’s to sunrise', () => {
    const isha = reminderDue(prayerDay(JAKARTA, AUTO, into('isha')), into('isha'), none, {});
    expect(isha?.endsAt).toEqual(prayerDay(JAKARTA, AUTO, into('isha')).next.at);
    const fajr = reminderDue(prayerDay(JAKARTA, AUTO, into('fajr')), into('fajr'), none, {});
    expect(fajr?.endsAt).toEqual(day.times.sunrise);
    // Between sunrise and Dhuhr no prayer's time is running.
    expect(askedAt({}, new Date('2026-10-23T03:00:00Z'))).toBeNull();
  });

  it('treats last night’s Isha as one prayer either side of midnight', () => {
    const lateNight = new Date('2026-10-23T18:30:00Z'); // 01:30 on the 24th in Jakarta
    expect(askedAt({}, lateNight)).toBe('isha');
    // Answered at 20:10 the night before: not asked again after midnight.
    const answered = answer({}, into('isha'));
    expect(answered).toHaveProperty(['2026-10-23:isha']);
    expect(askedAt(answered, lateNight)).toBeNull();
    // The next night's Isha is a new prayer, asked about afresh.
    const nextNight = new Date(into('isha').getTime() + 24 * 3_600_000);
    expect(askedAt(answered, nextNight)).toBe('isha');
  });

  it('waits out a snooze, then asks again within the same prayer', () => {
    const at = into('asr');
    const due = reminderDue(prayerDay(JAKARTA, AUTO, at), at, none, {});
    const snoozed = { snooze: { id: due?.id ?? '', until: at.getTime() + 20 * 60_000 } };
    expect(reminderDue(prayerDay(JAKARTA, AUTO, at), at, snoozed, {})).toBeNull();
    const later = new Date(at.getTime() + 21 * 60_000);
    expect(reminderDue(prayerDay(JAKARTA, AUTO, later), later, snoozed, {})?.prayer).toBe('asr');
  });
});

describe('upcomingPrayers', () => {
  const now = new Date('2026-10-23T08:00:00Z'); // 15:00 in Jakarta, after Asr

  it('lists what is still to come, day by day, with each prayer’s end', () => {
    const upcoming = upcomingPrayers(JAKARTA, AUTO, now, 2);
    expect(upcoming.map((p) => p.key)).toEqual([
      '2026-10-23:maghrib',
      '2026-10-23:isha',
      ...SALAH.map((name) => `2026-10-24:${name}`),
    ]);
    const tomorrow = prayerDay(JAKARTA, AUTO, new Date('2026-10-24T03:00:00Z'));
    const fajr = upcoming.find((p) => p.key === '2026-10-24:fajr');
    expect(fajr?.end).toEqual(tomorrow.times.sunrise);
    // Isha's time runs to the next day's Fajr.
    expect(upcoming.find((p) => p.key === '2026-10-23:isha')?.end).toEqual(tomorrow.times.fajr);
  });

  it('keys each prayer by the place’s calendar day, not the device’s', () => {
    // London's Isha on the 23rd starts after midnight UTC+7 but is still the 23rd there.
    const london = upcomingPrayers(LONDON, AUTO, new Date('2026-10-23T12:00:00Z'), 1);
    expect(london.map((p) => p.key)).toEqual(['2026-10-23:asr', '2026-10-23:maghrib', '2026-10-23:isha']);
  });
});

describe('prayer history', () => {
  const full = (log: PrayerLog, day: string) => {
    for (const name of SALAH) log[prayerKey(day, name)] = 1;
    return log;
  };

  it('moves date keys by calendar days, across months and DST', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-10-25', 1)).toBe('2026-10-26');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('marks today’s prayers still to come as upcoming, the rest open or prayed', () => {
    const now = new Date('2026-10-23T08:00:00Z'); // after Asr in Jakarta
    const day = prayerDay(JAKARTA, AUTO, now);
    const today = todayIn(JAKARTA, now);
    const log = { [prayerKey(today, 'fajr')]: 1, [prayerKey(shiftDay(today, -1), 'isha')]: 1 };
    const [first, second] = prayerHistory(log, today, day, now, 2);
    expect(first.prayers).toEqual({
      fajr: 'prayed',
      dhuhr: 'open',
      asr: 'open',
      maghrib: 'upcoming',
      isha: 'upcoming',
    });
    expect(first.count).toBe(1);
    expect(second).toMatchObject({ day: '2026-10-22', count: 1 });
    expect(second.prayers.isha).toBe('prayed');
  });

  it('counts complete days in a row, not broken by a day still under way', () => {
    const log = full(full(full({}, '2026-10-20'), '2026-10-21'), '2026-10-22');
    expect(prayerStreak(log, '2026-10-23')).toEqual({ current: 3, best: 3 });
    // Today done too: it joins the run.
    expect(prayerStreak(full({ ...log }, '2026-10-23'), '2026-10-23').current).toBe(4);
    // A missed day ends the run; the best is remembered.
    expect(prayerStreak(log, '2026-10-25')).toEqual({ current: 0, best: 3 });
    const gap = full(full({ ...log }, '2026-10-24'), '2026-10-25');
    expect(prayerStreak(gap, '2026-10-25')).toEqual({ current: 2, best: 3 });
  });
});
