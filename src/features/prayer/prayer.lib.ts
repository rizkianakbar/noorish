import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';
import { dateKey } from '#/lib/progress.ts';
import type { MethodId, Place, PrayerLog, PrayerName, PrayerSettings, SalahName } from './prayer.types.ts';

export const PRAYERS: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * The five daily prayers, the ones that are prayed and kept in the log.
 */
export const SALAH: SalahName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const KAABA = { lat: 21.4225, lng: 39.8262 };

/**
 * Kemenag (Indonesia's Ministry of Religious Affairs): Fajr at 20°, Isha at
 * 18°, and the customary 2-minute ihtiyat (safety margin) on each time,
 * taken off sunrise so it is never later than the real one.
 */
function kemenag(): CalculationParameters {
  const params = new CalculationParameters('Other', 20, 18);
  params.methodAdjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 };
  return params;
}

export const METHODS: Record<MethodId, { label: string; params: () => CalculationParameters }> = {
  kemenag: { label: 'Kemenag (Indonesia)', params: kemenag },
  jakim: { label: 'JAKIM / MUIS (Malaysia, Singapore)', params: CalculationMethod.Singapore },
  mwl: { label: 'Muslim World League', params: CalculationMethod.MuslimWorldLeague },
  ummalqura: { label: 'Umm al-Qura (Makkah)', params: CalculationMethod.UmmAlQura },
  isna: { label: 'ISNA (North America)', params: CalculationMethod.NorthAmerica },
  egyptian: { label: 'Egyptian General Authority', params: CalculationMethod.Egyptian },
  karachi: { label: 'University of Karachi', params: CalculationMethod.Karachi },
  dubai: { label: 'Dubai', params: CalculationMethod.Dubai },
  kuwait: { label: 'Kuwait', params: CalculationMethod.Kuwait },
  qatar: { label: 'Qatar', params: CalculationMethod.Qatar },
  turkey: { label: 'Diyanet (Turkey)', params: CalculationMethod.Turkey },
  tehran: { label: 'Tehran', params: CalculationMethod.Tehran },
  moonsighting: { label: 'Moonsighting Committee', params: CalculationMethod.MoonsightingCommittee },
};

const METHOD_BY_COUNTRY: Record<string, MethodId> = {
  ID: 'kemenag',
  MY: 'jakim',
  SG: 'jakim',
  BN: 'jakim',
  SA: 'ummalqura',
  US: 'isna',
  CA: 'isna',
  EG: 'egyptian',
  PK: 'karachi',
  IN: 'karachi',
  BD: 'karachi',
  AF: 'karachi',
  AE: 'dubai',
  KW: 'kuwait',
  QA: 'qatar',
  TR: 'turkey',
  IR: 'tehran',
  GB: 'moonsighting',
};

/**
 * Countries for "use my location" places, which come without one. Only the
 * zones whose country has its own default method.
 */
const COUNTRY_BY_TIMEZONE: Record<string, string> = {
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Singapore': 'SG',
  'Asia/Brunei': 'BN',
  'Asia/Riyadh': 'SA',
  'Africa/Cairo': 'EG',
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Europe/Istanbul': 'TR',
  'Asia/Tehran': 'IR',
  'Europe/London': 'GB',
};

export function countryForTimezone(timezone: string): string | undefined {
  if (COUNTRY_BY_TIMEZONE[timezone]) return COUNTRY_BY_TIMEZONE[timezone];
  if (timezone.startsWith('America/') && !timezone.includes('Argentina')) return 'US';
  return undefined;
}

/**
 * The method a place's own authorities use, when the reader hasn't chosen one.
 */
export function methodFor(settings: PrayerSettings, place: Place): MethodId {
  if (settings.method !== 'auto') return settings.method;
  return (place.country && METHOD_BY_COUNTRY[place.country]) || 'mwl';
}

/**
 * The calendar date at `instant` in `timezone`, as a local-midnight Date:
 * adhan reads only its year, month and day.
 */
function dateIn(timezone: string, instant: Date): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(get('year'), get('month') - 1, get('day'));
}

export type DayTimes = Record<PrayerName, Date>;

function timesOn(place: Place, settings: PrayerSettings, date: Date): DayTimes {
  const params = METHODS[methodFor(settings, place)].params();
  params.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const times = new PrayerTimes(new Coordinates(place.lat, place.lng), date, params);
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

export interface PrayerDay {
  times: DayTimes;
  /**
   * The next prayer to come (never sunrise), tomorrow's Fajr after Isha.
   */
  next: { name: SalahName; at: Date };
  /**
   * The prayer whose time it is now, or null between Fajr's end (sunrise)
   * and Dhuhr, and before today's Fajr.
   */
  current: SalahName | null;
  /**
   * The prayer whose time is running, from its adhan to the next one (Fajr's
   * to sunrise). Like `current`, but past midnight it is still last night's
   * Isha until Fajr. `key` names that one prayer in the log.
   */
  ongoing: { name: SalahName; start: Date; end: Date; key: string } | null;
}

export function prayerDay(place: Place, settings: PrayerSettings, now: Date): PrayerDay {
  const today = dateIn(place.timezone, now);
  const times = timesOn(place, settings, today);
  const upcoming = PRAYERS.filter((p) => p !== 'sunrise').find((p) => times[p] > now) as PrayerDay['next']['name'];
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const next = upcoming
    ? { name: upcoming, at: times[upcoming] }
    : { name: 'fajr' as const, at: timesOn(place, settings, tomorrow).fajr };

  const passed = PRAYERS.filter((p) => times[p] <= now).at(-1);
  const current = !passed || passed === 'sunrise' ? null : passed;

  let ongoing: PrayerDay['ongoing'] = null;
  if (now < times.fajr) {
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const start = timesOn(place, settings, yesterday).isha;
    ongoing = { name: 'isha', start, end: times.fajr, key: prayerKey(dateKey(yesterday), 'isha') };
  } else if (current) {
    const end = current === 'fajr' ? times.sunrise : next.at;
    ongoing = { name: current, start: times[current], end, key: prayerKey(dateKey(today), current) };
  }
  return { times, next, current, ongoing };
}

/**
 * One prayer in the log: the day its time began, in the place's zone, and
 * its name, e.g. `2026-10-30:isha`. So last night's Isha is the same prayer
 * either side of midnight, and a day's row in the history is its five keys.
 */
export function prayerKey(day: string, name: SalahName): string {
  return `${day}:${name}`;
}

/**
 * Today's date key in the place's zone.
 */
export function todayIn(place: Place, now: Date): string {
  return dateKey(dateIn(place.timezone, now));
}

/**
 * `day` moved by `days` (negative for earlier). Date keys are plain dates,
 * so this is calendar arithmetic in UTC, safe from DST.
 */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface UpcomingPrayer {
  name: SalahName;
  key: string;
  start: Date;
  /**
   * When its time is over: the next adhan, Fajr's at sunrise.
   */
  end: Date;
}

/**
 * Every prayer whose time begins after `now`, over the next `days` days,
 * for scheduling notifications ahead.
 */
export function upcomingPrayers(place: Place, settings: PrayerSettings, now: Date, days: number): UpcomingPrayer[] {
  const today = dateIn(place.timezone, now);
  const on = (offset: number) =>
    timesOn(place, settings, new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  const result: UpcomingPrayer[] = [];
  let times = on(0);
  for (let offset = 0; offset < days; offset++) {
    const tomorrow = on(offset + 1);
    const day = shiftDay(dateKey(today), offset);
    const ends: Record<SalahName, Date> = {
      fajr: times.sunrise,
      dhuhr: times.asr,
      asr: times.maghrib,
      maghrib: times.isha,
      isha: tomorrow.fajr,
    };
    for (const name of SALAH) {
      if (times[name] > now) result.push({ name, key: prayerKey(day, name), start: times[name], end: ends[name] });
    }
    times = tomorrow;
  }
  return result;
}

/**
 * Direction of the Kaaba in degrees clockwise from true north.
 */
export function qiblaBearing(place: Pick<Place, 'lat' | 'lng'>): number {
  return Qibla(new Coordinates(place.lat, place.lng));
}

/**
 * Great-circle distance to the Kaaba in kilometres.
 */
export function kaabaDistanceKm(place: Pick<Place, 'lat' | 'lng'>): number {
  const rad = Math.PI / 180;
  const dLat = (KAABA.lat - place.lat) * rad;
  const dLng = (KAABA.lng - place.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(place.lat * rad) * Math.cos(KAABA.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function compassPoint(bearing: number): (typeof COMPASS_POINTS)[number] {
  return COMPASS_POINTS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

/**
 * Signed shortest turn from `from` to `to`, in degrees (-180, 180].
 */
export function turnBetween(from: number, to: number): number {
  const d = ((((to - from) % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}

export const ARABIC_NAMES: Record<PrayerName, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export function minutesUntil(at: Date, now: Date): number {
  return Math.max(0, Math.ceil((at.getTime() - now.getTime()) / 60_000));
}

/**
 * A prayer the reader asked to be reminded of later (see `prayerKey`).
 */
export interface ReminderState {
  snooze: { id: string; until: number } | null;
}

/**
 * The prayer to ask about now: the one whose time is running, unless it is
 * already in the log or is snoozed. Every adhan brings a fresh question,
 * five a day. With when its time ends and its key for logging the answer.
 */
export function reminderDue(
  day: PrayerDay,
  now: Date,
  state: ReminderState,
  log: PrayerLog,
): { prayer: SalahName; endsAt: Date; id: string } | null {
  if (!day.ongoing) return null;
  const { key: id } = day.ongoing;
  if (log[id]) return null;
  if (state.snooze?.id === id && state.snooze.until > now.getTime()) return null;
  return { prayer: day.ongoing.name, endsAt: day.ongoing.end, id };
}

export interface HistoryDay {
  day: string;
  /**
   * Each prayer: logged, not logged, or its time hasn't begun yet.
   */
  prayers: Record<SalahName, 'prayed' | 'open' | 'upcoming'>;
  count: number;
}

/**
 * The last `days` days of the log, newest first. Today's prayers still to
 * come are `upcoming`, so they can't be ticked before their time.
 */
export function prayerHistory(log: PrayerLog, today: string, day: PrayerDay, now: Date, days: number): HistoryDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDay(today, -i);
    let count = 0;
    const prayers = {} as HistoryDay['prayers'];
    for (const name of SALAH) {
      if (log[prayerKey(date, name)]) {
        prayers[name] = 'prayed';
        count++;
      } else prayers[name] = i === 0 && day.times[name] > now ? 'upcoming' : 'open';
    }
    return { day: date, prayers, count };
  });
}

/**
 * Days in a row with all five prayers logged, up to today. A day still
 * under way doesn't break the run: it counts once complete.
 */
export function prayerStreak(log: PrayerLog, today: string): { current: number; best: number } {
  const complete = (day: string) => SALAH.every((name) => log[prayerKey(day, name)]);
  const days = new Set(Object.keys(log).map((key) => key.slice(0, 10)));
  let current = 0;
  for (let day = complete(today) ? today : shiftDay(today, -1); complete(day); day = shiftDay(day, -1)) current++;

  let best = current;
  for (const day of days) {
    // Count each run once, from its first day.
    if (!complete(day) || complete(shiftDay(day, -1))) continue;
    let length = 0;
    for (let d = day; complete(d); d = shiftDay(d, 1)) length++;
    best = Math.max(best, length);
  }
  return { current, best };
}
