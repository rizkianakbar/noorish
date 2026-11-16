import { queryOptions, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { prefsStore, surahLangs, usePrefs } from '#/lib/prefs.ts';
import chapters from './chapters.json' with { type: 'json' };
import { mergeSurah, surahPath, translationPath } from './surah-files.ts';
import type { BaseSurah, Chapter, QuranLang, SurahData, SurahTranslation, TafsirData, TafsirSlug } from './types.ts';

/**
 * Quran content is static JSON under /quran (built by `bun quran:build`).
 * Promises are cached so repeat navigation never refetches or reparses.
 */
const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function getJson<T>(path: string): Promise<T> {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetchJson(path);
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit as Promise<T>;
}

/**
 * The chapter list is small and needed on every page (and by the server for
 * page titles), so it is bundled rather than fetched.
 */
export function getChapters(): Promise<Chapter[]> {
  return Promise.resolve(chapters as Chapter[]);
}

/**
 * All 114 chapters; static for the life of the page.
 */
export const chaptersQuery = queryOptions({
  queryKey: ['quran', 'chapters'],
  queryFn: getChapters,
  staleTime: Infinity,
  gcTime: Infinity,
});

export function useChapters() {
  return useQuery(chaptersQuery);
}

/**
 * Surahs merged with their translations, by surah and languages.
 */
const surahs = new Map<string, Promise<SurahData>>();
const loadedSurahs = new Map<string, SurahData>();
const surahKey = (surah: number, langs: QuranLang[]) => `${surah}:${langs.join()}`;

/**
 * A surah with its translations and word meanings in `langs` (by default
 * the ones the reader's settings need): the base file and one small file per
 * language, fetched in parallel.
 */
export function getSurah(surah: number, langs: QuranLang[] = surahLangs(prefsStore.get())): Promise<SurahData> {
  const key = surahKey(surah, langs);
  let hit = surahs.get(key);
  if (!hit) {
    hit = Promise.all([
      fetchJson<BaseSurah>(surahPath(surah)),
      ...langs.map((lang) => fetchJson<SurahTranslation>(translationPath(lang, surah))),
    ]).then(([base, ...files]) => {
      const data = mergeSurah(
        base as BaseSurah,
        Object.fromEntries(langs.map((lang, i) => [lang, files[i] as SurahTranslation])),
      );
      loadedSurahs.set(key, data);
      return data;
    });
    hit.catch(() => surahs.delete(key));
    surahs.set(key, hit);
  }
  return hit;
}

/**
 * Pull a surah (in the reader's languages) into the browser's caches without
 * parsing it or keeping it in memory: opening it later is a cache read.
 */
export function prefetchSurah(surah: number): Promise<unknown> {
  const paths = [surahPath(surah), ...surahLangs(prefsStore.get()).map((lang) => translationPath(lang, surah))];
  return Promise.all(paths.map((path) => fetch(path).then((res) => res.arrayBuffer())));
}

export function getTafsir(source: TafsirSlug, surah: number): Promise<TafsirData> {
  return getJson(`/quran/tafsir/${source}/${surah}.json`);
}

export function isValidSurah(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 114;
}

/**
 * Subscribe a component to a surah in the reader's languages; undefined until
 * it first loads. A surah the route loader already fetched renders on the
 * first pass. When the languages change, the surah on screen stays until the
 * new translation arrives, rather than dropping back to a skeleton.
 */
export function useSurah(surah: number): SurahData | undefined {
  const langs = surahLangs(usePrefs());
  const key = surahKey(surah, langs);
  const [, setLoaded] = useState(0);
  const shown = useRef<SurahData | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `surah` and `langs`
  useEffect(() => {
    if (loadedSurahs.has(key)) return;
    let cancelled = false;
    getSurah(surah, langs)
      .then(() => !cancelled && setLoaded((n) => n + 1))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  const data = loadedSurahs.get(key) ?? (shown.current?.surah === surah ? shown.current : undefined);
  shown.current = data;
  return data;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toArabicNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}
