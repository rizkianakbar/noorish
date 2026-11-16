import { matchesAll, normalizeArabic, type ParsedQuery } from '#/features/search/search.lib.ts';
import type { Language } from '#/lib/prefs.ts';
import type { Dua } from './duas.types.ts';

/**
 * How many times a dua is said, from its note ("Recite 3x", "Dibaca 3 kali",
 * "100 times"), or null when it is said once.
 */
export function repeatCount(note: string | null): number | null {
  const match = note?.match(/(\d+)\s*(?:x|×|kali|times)/i);
  const count = match ? Number(match[1]) : 1;
  return count > 1 ? count : null;
}

/**
 * The category to open on: morning dhikr from Fajr until midday, evening
 * dhikr from Asr into the night, the daily duas otherwise.
 */
export function categoryForHour(hour: number): string {
  if (hour >= 3 && hour < 12) return 'morning-dhikr';
  if (hour >= 15 && hour < 21) return 'evening-dhikr';
  return 'daily-dua';
}

/**
 * Adhkar said in full as a daily routine, counted as they are said. The
 * other categories are references, looked up for the moment at hand.
 */
export const ROUTINE_CATEGORIES = new Set(['morning-dhikr', 'evening-dhikr', 'dhikr-after-salah']);

export interface DuaHit {
  dua: Dua;
  category: string;
}

/**
 * Duas matching a search, in both languages (an Indonesian reader may type
 * "makan", an English one "eating"), titles before text matches.
 */
export function searchDuas(entries: DuaHit[], query: ParsedQuery, limit = 6): DuaHit[] {
  const scored: { hit: DuaHit; score: number }[] = [];
  for (const hit of entries) {
    const { dua } = hit;
    let score = 0;
    if (query.arabic) {
      if (normalizeArabic(dua.arabic).includes(query.arabic)) score = 1;
    } else if (matchesAll(`${dua.title.en} ${dua.title.id}`, query.terms)) {
      score = 2;
    } else if (
      matchesAll(
        [dua.translation.en, dua.translation.id, dua.latin.en, dua.latin.id, dua.notes.en, dua.notes.id].join(' '),
        query.terms,
      )
    ) {
      score = 1;
    }
    if (score) scored.push({ hit, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit }) => hit);
}

/**
 * Each category's Arabic name and when it is said, for its header.
 */
export const CATEGORY_ARABIC: Record<string, string> = {
  'morning-dhikr': 'أذكار الصباح',
  'evening-dhikr': 'أذكار المساء',
  'dhikr-after-salah': 'الأذكار بعد الصلاة',
  'daily-dua': 'أدعية يومية',
  'selected-dua': 'أدعية مختارة',
};

/**
 * Each category's URL, in Indonesian as people search for it ("dzikir pagi",
 * "doa harian"): `/duas/dzikir-pagi`.
 */
export const DUA_URL_SLUGS: Record<string, string> = {
  'morning-dhikr': 'dzikir-pagi',
  'evening-dhikr': 'dzikir-petang',
  'dhikr-after-salah': 'dzikir-setelah-shalat',
  'daily-dua': 'doa-harian',
  'selected-dua': 'doa-pilihan',
};

/**
 * The category a URL slug names, or undefined for an unknown one.
 */
export function categoryFromUrl(urlSlug: string): string | undefined {
  return Object.keys(DUA_URL_SLUGS).find((slug) => DUA_URL_SLUGS[slug] === urlSlug);
}

/**
 * A title without the "Supplication"/"Doa" every entry in a list starts
 * with, so "Doa Sebelum Makan" reads "Sebelum Makan" under its category.
 */
export function shortTitle(title: string): string {
  const short = title.replace(/^(?:supplication|prayer|dua|doa)\s+/i, '');
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/**
 * Text split around its "(1)" verse numbers, so they can be drawn as markers
 * rather than bracketed digits (which also flip about in Arabic).
 */
export function splitVerseNumbers(text: string): (string | number)[] {
  return text
    .split(/\s*\((\d+)\)/)
    .map((part, i) => (i % 2 ? Number(part) : part))
    .filter((part) => part !== '');
}

/**
 * The daily duas by occasion, so 38 of them can be scanned. Keys are dua ids
 * (`bun duas:fetch` keeps them stable); a dua not listed falls under `other`.
 */
export const DAILY_GROUPS: { key: string; ids: number[] }[] = [
  { key: 'sleep', ids: [1, 2] },
  { key: 'purity', ids: [3, 4, 10, 11] },
  { key: 'food', ids: [5, 6, 7, 12] },
  { key: 'mosque', ids: [8, 9, 37] },
  { key: 'home', ids: [13, 14, 15, 16] },
  { key: 'travel', ids: [17, 18, 19, 22] },
  { key: 'clothes', ids: [20, 21] },
  { key: 'weather', ids: [23, 24, 25, 26] },
  { key: 'hardship', ids: [27, 28, 29, 30, 31, 38] },
  { key: 'sneezing', ids: [32, 33, 34] },
  { key: 'character', ids: [35, 36] },
];

export function groupDailyDuas<T extends { id: string }>(duas: T[]): { key: string; duas: T[] }[] {
  const number = (dua: T) => Number(dua.id.split('-').pop());
  const listed = new Set(DAILY_GROUPS.flatMap((g) => g.ids));
  const groups = DAILY_GROUPS.map((g) => ({ key: g.key, duas: duas.filter((d) => g.ids.includes(number(d))) }));
  groups.push({ key: 'other', duas: duas.filter((d) => !listed.has(number(d))) });
  return groups.filter((g) => g.duas.length > 0);
}

/**
 * Said in full today: its count reached (once, for a dua said once).
 */
export function isSaid(dua: Dua, said: Record<string, number>, language: Language): boolean {
  return (said[dua.id] ?? 0) >= (repeatCount(dua.notes[language]) ?? 1);
}
