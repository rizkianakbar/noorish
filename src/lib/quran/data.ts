import { queryOptions, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import chapters from './chapters.json' with { type: 'json' };
import type { Chapter, SurahData, TafsirData, TafsirSlug } from './types.ts';

/**
 * Quran content is static JSON under /quran (built by `bun quran:fetch`).
 * Promises are cached so repeat navigation never refetches or reparses.
 */
const cache = new Map<string, Promise<unknown>>();
const resolved = new Map<string, unknown>();

function getJson<T>(path: string): Promise<T> {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetch(path).then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
      const data = await res.json();
      resolved.set(path, data);
      return data;
    });
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit as Promise<T>;
}

export const surahPath = (surah: number) => `/quran/${surah}.json`;

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

export function getSurah(surah: number): Promise<SurahData> {
  return getJson(surahPath(surah));
}

/**
 * Pull a surah into the browser's caches (service worker, HTTP) without
 * parsing it or keeping it in memory: opening it later is a cache read.
 */
export function prefetchSurah(surah: number): Promise<unknown> {
  return fetch(surahPath(surah)).then((res) => res.arrayBuffer());
}

/**
 * The already-loaded surah, if any — lets the reader skip the skeleton.
 */
export function getLoadedSurah(surah: number): SurahData | undefined {
  return resolved.get(surahPath(surah)) as SurahData | undefined;
}

export function getTafsir(source: TafsirSlug, surah: number): Promise<TafsirData> {
  return getJson(`/quran/tafsir/${source}/${surah}.json`);
}

export function isValidSurah(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 114;
}

/**
 * Subscribe a component to a surah load; returns undefined until it resolves.
 */
export function useSurah(surah: number): SurahData | undefined {
  const [data, setData] = useState(() => getLoadedSurah(surah));

  useEffect(() => {
    let cancelled = false;
    setData(getLoadedSurah(surah));
    getSurah(surah).then((loaded) => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [surah]);

  // After a param change, read the cache directly so a surah the route loader
  // already fetched renders on the first pass rather than after the effect.
  return data?.surah === surah ? data : getLoadedSurah(surah);
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toArabicNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}
