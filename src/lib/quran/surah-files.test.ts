import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeSurah, splitSurah, surahPath, translationPath } from './surah-files.ts';
import type { BaseSurah, SourceSurah, SurahTranslation } from './types.ts';

const root = join(import.meta.dirname, '../../..');
const read = <T>(path: string): T => JSON.parse(readFileSync(join(root, path), 'utf8'));
const source = (n: number) => read<SourceSurah>(`data/quran/${n}.json`);

describe('surah files', () => {
  it('lose nothing: merging every language back gives the downloaded surah', () => {
    const surah = source(2);
    const { base, translations } = splitSurah(surah);
    const { version: _, ...expected } = surah;
    expect(mergeSurah(base, translations)).toEqual(expected);
  });

  it('give a reader only the languages asked for', () => {
    const { base, translations } = splitSurah(source(1));
    const verse = mergeSurah(base, { id: translations.id }).verses[0];
    expect(verse.id).toBe(source(1).verses[0].id);
    expect(verse.en).toBeUndefined();
    expect(verse.words[0].en).toBeUndefined();
  });

  it('are in step with data/quran (else run `bun quran:build`)', () => {
    for (const n of [1, 2, 114]) {
      const served = mergeSurah(read<BaseSurah>(`public${surahPath(n)}`), {
        en: read<SurahTranslation>(`public${translationPath('en', n)}`),
        id: read<SurahTranslation>(`public${translationPath('id', n)}`),
      });
      const { version: _, ...expected } = source(n);
      expect(served).toEqual(expected);
    }
  });
});
