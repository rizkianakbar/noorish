export interface Chapter {
  number: number;
  nameArabic: string;
  nameSimple: string;
  nameEn: string;
  nameId: string;
  revelationPlace: 'makkah' | 'madinah';
  revelationOrder: number;
  bismillahPre: boolean;
  versesCount: number;
  pages: [number, number];
}

/**
 * The languages translations and word meanings come in.
 */
export type QuranLang = 'en' | 'id';

/**
 * One Arabic word with its transliteration (`t`) and, once loaded, its
 * meaning in each requested language.
 */
export interface Word extends Partial<Record<QuranLang, string>> {
  a: string;
  t: string;
}

/**
 * A verse as the reader uses it: the base file merged with the translation
 * files that were requested (see `getSurah`), so `en`/`id` are set only for
 * those languages.
 */
export interface Verse extends Partial<Record<QuranLang, string>> {
  n: number;
  key: string;
  arabic: string;
  page: number;
  juz: number;
  /**
   * Transliteration: quran.com's for English readers, Kemenag's (the style
   * printed in Indonesian mushafs) for Indonesian readers.
   */
  latinEn: string;
  latinId: string;
  words: Word[];
}

export interface SurahData {
  surah: number;
  verses: Verse[];
}

/**
 * Served `public/quran/{n}.json`: everything but the translations.
 */
export interface BaseSurah {
  surah: number;
  verses: (Omit<Verse, QuranLang | 'words'> & { words: { a: string; t: string }[] })[];
}

/**
 * Served `public/quran/{lang}/{n}.json`: per verse, its translation and the
 * meaning of each word, in verse and word order.
 */
export type SurahTranslation = [translation: string, words: string[]][];

/**
 * A surah as `bun quran:fetch` downloads it into `data/quran/` (not served):
 * every language at once. `bun quran:build` splits it into the files above.
 */
export interface SourceSurah {
  version: number;
  surah: number;
  verses: (Required<Omit<Verse, 'words'>> & { words: Required<Word>[] })[];
}

/**
 * A tafsir passage; passages covering several consecutive verses are stored once.
 */
export interface TafsirEntry {
  from: number;
  to: number;
  text: string;
}

export interface TafsirData {
  surah: number;
  source: string;
  entries: TafsirEntry[];
}

export type TafsirSlug = 'ibn-kathir' | 'kemenag';
