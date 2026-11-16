/**
 * Builds the files the reader loads from the surahs `bun quran:fetch`
 * downloaded into `data/quran/`:
 * - `public/quran/{n}.json`: each surah without its translations;
 * - `public/quran/{en,id}/{n}.json`: its translation and word meanings, so a
 *   reader downloads only their own language (see `surah-files.ts`);
 * - `public/quran/search-{en,id}.json`: the verse search index, folded here
 *   (see `search.lib.ts`) so the search worker loads one file and searches.
 *
 * Usage: `bun quran:build` (also run by `bun quran:fetch`). Rerun whenever
 * `data/quran/`, the file split, or the folding in `search.lib.ts` changes.
 */
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { searchIndexPath, toIndexedVerse } from '#/features/search/search.lib.ts';
import { QURAN_LANGS, splitSurah, surahPath, translationPath } from '#/lib/quran/surah-files.ts';
import type { SourceSurah } from '#/lib/quran/types.ts';

const DATA_DIR = join(import.meta.dirname, '../data/quran');
const PUBLIC_DIR = join(import.meta.dirname, '../public');
const write = (path: string, data: unknown) => writeFile(join(PUBLIC_DIR, path), JSON.stringify(data));

const surahs: SourceSurah[] = Array.from({ length: 114 }, (_, i) =>
  JSON.parse(readFileSync(join(DATA_DIR, `${i + 1}.json`), 'utf8')),
);

for (const lang of QURAN_LANGS) await mkdir(join(PUBLIC_DIR, 'quran', lang), { recursive: true });

for (const surah of surahs) {
  const { base, translations } = splitSurah(surah);
  await write(surahPath(surah.surah), base);
  for (const lang of QURAN_LANGS) await write(translationPath(lang, surah.surah), translations[lang]);
}
console.log('Wrote 114 surahs, each with its en and id translations');

for (const lang of QURAN_LANGS) {
  const verses = surahs.flatMap((surah) => surah.verses.map((verse) => toIndexedVerse(surah.surah, verse, lang)));
  await write(searchIndexPath(lang), verses);
  console.log(`Wrote the ${lang} search index (${verses.length} verses)`);
}
