import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type DuaHit, searchDuas } from '#/features/duas/duas.lib.ts';
import type { Dua, DuaIndex } from '#/features/duas/duas.types.ts';
import duaIndexJson from '#/features/duas/duas-index.json' with { type: 'json' };
import { searchHadith } from '#/features/hadith/hadith.lib.ts';
import type { HadithIndex } from '#/features/hadith/hadith.types.ts';
import hadithIndexJson from '#/features/hadith/hadith-index.json' with { type: 'json' };
import type { SurahData } from '#/lib/quran/types.ts';
import {
  type IndexedVerse,
  matchesAll,
  parseQuery,
  searchIndex,
  searchIndexPath,
  toIndexedVerse,
} from './search.lib.ts';

// The real collections from `public/` (`bun duas:fetch`, `bun hadith:fetch`), so these
// tests prove the searches people actually type.
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(import.meta.dirname, '../../../public', path), 'utf8'));
const duaIndex = duaIndexJson as DuaIndex;
const duas: DuaHit[] = duaIndex.categories.flatMap((c) =>
  read<Dua[]>(`duas/${c.slug}.json`).map((dua) => ({ dua, category: c.slug })),
);
const hadithIndex = hadithIndexJson as HadithIndex;

describe('parseQuery', () => {
  it('takes "doa" or "hadis" as what is wanted, the rest as what about', () => {
    expect(parseQuery('Doa makan')).toEqual({ intent: 'dua', terms: ['makan'], arabic: null });
    expect(parseQuery('hadith fasting')).toEqual({ intent: 'hadith', terms: ['fasting'], arabic: null });
    expect(parseQuery('sabar')).toEqual({ intent: null, terms: ['sabar'], arabic: null });
    expect(parseQuery('بسم الله').arabic).toBe('بسم الله');
  });

  it('matches at word starts, so a short word doesn’t hide inside another', () => {
    expect(matchesAll('Sebelum Makan', ['makan'])).toBe(true);
    expect(matchesAll('Makanan', ['makan'])).toBe(true);
    expect(matchesAll('Funerals and death', ['eat'])).toBe(false);
  });
});

describe('searching duas', () => {
  it('finds the duas for eating, in Indonesian or English', () => {
    const titles = (q: string) => searchDuas(duas, parseQuery(q)).map((h) => h.dua.title.id);
    expect(titles('doa makan').some((t) => /makan/i.test(t))).toBe(true);
    expect(searchDuas(duas, parseQuery('dua eating')).length).toBeGreaterThan(0);
  });

  it('finds a dua by its Arabic', () => {
    expect(searchDuas(duas, parseQuery('أستغفر الله')).length).toBeGreaterThan(0);
  });
});

describe('searching hadith', () => {
  it('finds books by topic, including Indonesian topic words', () => {
    const books = (q: string) => searchHadith([], hadithIndex.collections, parseQuery(q)).books.map((b) => b.book.name);
    expect(books('hadis makan').some((name) => /food|eat|meal/i.test(name))).toBe(true);
    expect(books('hadith fasting').some((name) => /fast/i.test(name))).toBe(true);
    expect(books('hadis puasa').some((name) => /fast/i.test(name))).toBe(true);
  });
});

describe('the verse search index', () => {
  const index = read<IndexedVerse[]>(searchIndexPath('en'));

  it('is in step with the surah files and the folding (else run `bun search:index`)', () => {
    expect(index).toHaveLength(6236);
    for (const n of [1, 2, 114]) {
      const surah = read<SurahData>(`quran/${n}.json`);
      expect(index.filter(([s]) => s === n)).toEqual(surah.verses.map((v) => toIndexedVerse(n, v, 'en')));
    }
  });

  it('finds verses by translation, by Arabic without vowels, and by transliteration', () => {
    const keys = (q: string) => searchIndex(index, q).map((h) => `${h.surah}:${h.verse}`);
    expect(keys('Neither drowsiness overtakes Him')).toContain('2:255');
    expect(keys('الله لا اله الا هو الحي القيوم')).toContain('2:255');
    const latin = searchIndex(index, 'bismillahirrahmanirrahim');
    expect(latin.some((h) => h.surah === 1 && h.verse === 1 && h.viaLatin)).toBe(true);
  });
});
