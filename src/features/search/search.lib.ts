import type { Verse } from '#/lib/quran/types.ts';
import type { SearchHit } from './search.types.ts';

/**
 * Text folding shared by the search worker, the results view and the index
 * build (`bun search:index`).
 */

/**
 * Strip harakat and Quranic annotation marks so a plain-typed Arabic query
 * matches the fully vocalized Uthmani text; alef variants fold to bare alef.
 * Tatweel (the stretching stroke in الرحمـن) goes too, and ى/ة fold to ي/ه.
 */
export function normalizeArabic(text: string): string {
  return (
    text
      .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
      .replace(/\u0640/g, '')
      .replace(/[آأإٱ]/g, 'ا')
      // Uthmani spelling writes final ي as ى (الحى) and readers type either; same for ة/ه.
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
  );
}

export function normalizeLatin(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Transliterations vary in hyphens, apostrophes and spacing ("bismillahir-
 * rahmanir" vs "bismillah ar-rahman"), so compare letters only.
 */
export function compactLatin(text: string): string {
  return normalizeLatin(text).replace(/[^a-z0-9]/g, '');
}

export const ARABIC_SCRIPT = /[؀-ۿ]/;

export type SearchLang = 'en' | 'id';

/**
 * One verse of the prebuilt search index, as a tuple to keep the file small:
 * surah, verse, translation, transliteration (shown when only it matched),
 * then the folded Arabic, translation and transliteration that are searched.
 */
export type IndexedVerse = [number, number, string, string, string, string, string];

export const searchIndexPath = (lang: SearchLang) => `/quran/search-${lang}.json`;

export function toIndexedVerse(surah: number, verse: Verse, lang: SearchLang): IndexedVerse {
  return [
    surah,
    verse.n,
    verse[lang],
    verse.latinId,
    normalizeArabic(verse.arabic),
    normalizeLatin(verse[lang]),
    // Both styles, so either spelling finds the verse.
    compactLatin(`${verse.latinId} ${verse.latinEn}`),
  ];
}

const MAX_RESULTS = 200;

/**
 * Verses whose Arabic (for an Arabic query) or translation contains the
 * query, falling back to the transliteration for Latin queries.
 */
export function searchIndex(verses: IndexedVerse[], query: string): SearchHit[] {
  const isArabic = ARABIC_SCRIPT.test(query);
  const needle = isArabic ? normalizeArabic(query) : normalizeLatin(query);
  const latinNeedle = compactLatin(query);
  const hits: SearchHit[] = [];
  for (const [surah, verse, text, latin, arabic, translation, transliteration] of verses) {
    if (isArabic ? arabic.includes(needle) : translation.includes(needle)) {
      hits.push({ surah, verse, text, viaLatin: false });
    } else if (!isArabic && latinNeedle.length >= 3 && transliteration.includes(latinNeedle)) {
      hits.push({ surah, verse, text: latin, viaLatin: true });
    }
    if (hits.length >= MAX_RESULTS) break;
  }
  return hits;
}

/**
 * Words that say what kind of result is wanted rather than what about:
 * "doa makan" asks for duas about eating, "hadis puasa" for hadith on fasting.
 */
const DUA_WORDS = new Set(['doa', 'dua', 'duas', 'dzikir', 'zikir', 'dhikr', 'adhkar', 'azkar', 'wirid']);
const HADITH_WORDS = new Set(['hadis', 'hadits', 'hadith', 'hadist', 'hadiths', 'sunnah']);

export interface ParsedQuery {
  /**
   * The kind of result asked for, if the query names one.
   */
  intent: 'dua' | 'hadith' | null;
  /**
   * The words to match, folded; every one must appear.
   */
  terms: string[];
  /**
   * The query itself when typed in Arabic script, folded.
   */
  arabic: string | null;
}

export function parseQuery(query: string): ParsedQuery {
  if (ARABIC_SCRIPT.test(query)) return { intent: null, terms: [], arabic: normalizeArabic(query.trim()) };
  const words = normalizeLatin(query)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const intent = words.some((w) => DUA_WORDS.has(w)) ? 'dua' : words.some((w) => HADITH_WORDS.has(w)) ? 'hadith' : null;
  return { intent, terms: words.filter((w) => !DUA_WORDS.has(w) && !HADITH_WORDS.has(w)), arabic: null };
}

/**
 * Whether every term starts a word of the text (folded), each term or any of
 * its alternatives (see `expand`). Word starts, not anywhere: "makan" finds
 * "makanan" and "pray" finds "Prayers", but "eat" doesn't find "death".
 */
export function matchesAll(text: string, terms: string[], expand: (term: string) => string[] = (t) => [t]): boolean {
  const words = normalizeLatin(text).split(/[^a-z0-9]+/);
  return (
    terms.length > 0 &&
    terms.every((term) => expand(term).some((variant) => words.some((word) => word.startsWith(variant))))
  );
}
