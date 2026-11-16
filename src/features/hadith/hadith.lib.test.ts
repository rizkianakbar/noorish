import { describe, expect, it } from 'vitest';
import { parseQuery } from '#/features/search/search.lib.ts';
import { filterHadiths, gradeStrength, splitNarrator } from './hadith.lib.ts';
import type { Hadith } from './hadith.types.ts';

describe('gradeStrength', () => {
  it('reads gradings in their many spellings', () => {
    expect(gradeStrength('Sahih')).toBe('sahih');
    expect(gradeStrength('Hasan Sahih')).toBe('hasan');
    expect(gradeStrength("Da'if Jiddan")).toBe('weak');
    expect(gradeStrength('Maudu`')).toBe('weak');
    expect(gradeStrength('Shahih')).toBe('sahih');
    expect(gradeStrength('Unknown')).toBeNull();
  });
});

describe('splitNarrator', () => {
  it('sets the opening "Narrated …:" apart', () => {
    expect(splitNarrator('Narrated Abu Huraira: The Prophet said, "…"')).toEqual({
      narrator: 'Narrated Abu Huraira:',
      body: 'The Prophet said, "…"',
    });
    expect(splitNarrator('On the authority of Umar: …')).toEqual({
      narrator: null,
      body: 'On the authority of Umar: …',
    });
  });
});

describe('filterHadiths', () => {
  const hadiths: Hadith[] = [
    { number: 1, arabic: null, translation: 'Actions are by intentions', grades: [] },
    { number: 12, arabic: null, translation: 'Leave what does not concern you', grades: [] },
  ];
  it('finds a hadith by its words or its number', () => {
    expect(filterHadiths(hadiths, parseQuery('intentions')).map((h) => h.number)).toEqual([1]);
    expect(filterHadiths(hadiths, parseQuery('12')).map((h) => h.number)).toEqual([12]);
    expect(filterHadiths(hadiths, parseQuery(''))).toHaveLength(2);
  });
});
