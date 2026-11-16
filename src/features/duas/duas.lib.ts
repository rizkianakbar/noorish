import { matchesAll, normalizeArabic, type ParsedQuery } from '#/features/search/search.lib.ts';
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
