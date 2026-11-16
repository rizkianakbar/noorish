/**
 * Builds the verse search index, one file per translation language, from the
 * surah files in `public/quran/`. The text is folded here (see `search.lib.ts`)
 * so the search worker loads one file and searches at once, instead of
 * fetching all 114 surahs and folding 6,236 verses on the reader's phone.
 *
 * Usage: `bun search:index` (also run by `bun quran:fetch`). Rerun whenever
 * the surah files or the folding in `search.lib.ts` change.
 */
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { searchIndexPath, toIndexedVerse } from '#/features/search/search.lib.ts';
import type { SurahData } from '#/lib/quran/types.ts';

const PUBLIC_DIR = join(import.meta.dirname, '../public');

const surahs: SurahData[] = Array.from({ length: 114 }, (_, i) =>
  JSON.parse(readFileSync(join(PUBLIC_DIR, `quran/${i + 1}.json`), 'utf8')),
);

for (const lang of ['en', 'id'] as const) {
  const verses = surahs.flatMap((surah) => surah.verses.map((verse) => toIndexedVerse(surah.surah, verse, lang)));
  const path = join(PUBLIC_DIR, searchIndexPath(lang));
  await writeFile(path, JSON.stringify(verses));
  console.log(`Wrote ${verses.length} verses to ${path}`);
}
