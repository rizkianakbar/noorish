import type { BaseSurah, QuranLang, SourceSurah, SurahData, SurahTranslation, Verse } from './types.ts';

export const QURAN_LANGS: QuranLang[] = ['en', 'id'];

export const surahPath = (surah: number) => `/quran/${surah}.json`;
export const translationPath = (lang: QuranLang, surah: number) => `/quran/${lang}/${surah}.json`;

/**
 * Split a downloaded surah into the files the reader loads: one base file,
 * and per language its translations and word meanings. A reader then
 * downloads only the language it reads, not every language.
 */
export function splitSurah(source: SourceSurah): {
  base: BaseSurah;
  translations: Record<QuranLang, SurahTranslation>;
} {
  const base: BaseSurah = {
    surah: source.surah,
    verses: source.verses.map(({ en: _en, id: _id, words, ...verse }) => ({
      ...verse,
      words: words.map(({ a, t }) => ({ a, t })),
    })),
  };
  const translation = (lang: QuranLang): SurahTranslation =>
    source.verses.map((verse) => [verse[lang], verse.words.map((word) => word[lang])]);
  return { base, translations: { en: translation('en'), id: translation('id') } };
}

/**
 * The reader's surah: the base file with the requested languages' files
 * folded back into each verse and word.
 */
export function mergeSurah(base: BaseSurah, translations: Partial<Record<QuranLang, SurahTranslation>>): SurahData {
  const langs = Object.entries(translations) as [QuranLang, SurahTranslation][];
  return {
    surah: base.surah,
    verses: base.verses.map((baseVerse, i) => {
      const verse: Verse = {
        ...baseVerse,
        words: baseVerse.words.map((baseWord, j) => {
          const word = { ...baseWord } as Verse['words'][number];
          for (const [lang, file] of langs) {
            // A file may leave word meanings out (the server-rendered preview does).
            const meaning = file[i][1][j];
            if (meaning !== undefined) word[lang] = meaning;
          }
          return word;
        }),
      };
      for (const [lang, file] of langs) verse[lang] = file[i][0];
      return verse;
    }),
  };
}
