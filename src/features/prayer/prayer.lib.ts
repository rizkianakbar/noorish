import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';
import type { MethodId, Place, PrayerName, PrayerSettings } from './prayer.types.ts';

export const PRAYERS: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

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
  next: { name: Exclude<PrayerName, 'sunrise'>; at: Date };
  /**
   * The prayer whose time it is now, or null between Fajr's end (sunrise)
   * and Dhuhr, and before today's Fajr.
   */
  current: Exclude<PrayerName, 'sunrise'> | null;
  /**
   * The prayer whose time is running, from its adhan to the next one (Fajr's
   * to sunrise). Like `current`, but past midnight it is still last night's
   * Isha until Fajr. Its start identifies that one prayer.
   */
  ongoing: { name: Exclude<PrayerName, 'sunrise'>; start: Date; end: Date } | null;
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
    ongoing = { name: 'isha', start: timesOn(place, settings, yesterday).isha, end: times.fajr };
  } else if (current) {
    ongoing = { name: current, start: times[current], end: current === 'fajr' ? times.sunrise : next.at };
  }
  return { times, next, current, ongoing };
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
 * The reader's answers to the prayer reminder: the prayers they said they
 * prayed, and one they asked to be reminded of later. Each prayer is
 * identified by when its time began (see `prayerId`), so every adhan brings
 * a fresh question, five a day, and last night's Isha is the same prayer
 * either side of midnight.
 */
export interface ReminderState {
  answered: string[];
  snooze: { id: string; until: number } | null;
}

function prayerId(name: PrayerName, start: Date): string {
  return `${name}@${start.toISOString()}`;
}

/**
 * The prayer to ask about now: the one whose time is running, unless it was
 * answered or is snoozed. With when its time ends (the next adhan; Fajr's at
 * sunrise) and its id for recording the answer.
 */
export function reminderDue(
  day: PrayerDay,
  now: Date,
  state: ReminderState,
): { prayer: Exclude<PrayerName, 'sunrise'>; endsAt: Date; id: string } | null {
  if (!day.ongoing) return null;
  const id = prayerId(day.ongoing.name, day.ongoing.start);
  if (state.answered.includes(id)) return null;
  if (state.snooze?.id === id && state.snooze.until > now.getTime()) return null;
  return { prayer: day.ongoing.name, endsAt: day.ongoing.end, id };
}
