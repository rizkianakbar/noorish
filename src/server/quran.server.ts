import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mergeSurah, QURAN_LANGS, surahPath, translationPath } from '#/lib/quran/surah-files.ts';
import type { BaseSurah, SurahData, SurahTranslation } from '#/lib/quran/types.ts';

/**
 * How many verses a surah page is prerendered with: enough to fill the first
 * screens and give crawlers real text; the reader loads the rest.
 */
export const PREVIEW_VERSES = 20;

// `public/` in dev and when prerendering at build; `.output/public/` when the
// built server runs locally. Not present in the deployed function, where the
// prerendered pages are served as static files instead.
const ROOTS = ['public', '.output/public'].map((dir) => join(process.cwd(), dir));

async function readPublic<T>(path: string): Promise<T> {
  for (const root of ROOTS) {
    try {
      return JSON.parse(await readFile(join(root, path), 'utf8'));
    } catch {}
  }
  throw new Error(`Not found: ${path}`);
}

/**
 * The opening verses of a surah in every language, for the server-rendered
 * page, which can't know the reader's (CSS shows theirs). Word meanings are
 * left out: they only show in the popover, which waits for the full surah.
 * Null when the files aren't readable, and the page then renders in the browser.
 */
export async function readSurahPreview(surah: number): Promise<SurahData | null> {
  try {
    const [base, ...files] = await Promise.all([
      readPublic<BaseSurah>(surahPath(surah)),
      ...QURAN_LANGS.map((lang) => readPublic<SurahTranslation>(translationPath(lang, surah))),
    ]);
    const head = (file: SurahTranslation): SurahTranslation =>
      file.slice(0, PREVIEW_VERSES).map(([text]) => [text, []]);
    return mergeSurah(
      { ...base, verses: base.verses.slice(0, PREVIEW_VERSES) },
      Object.fromEntries(QURAN_LANGS.map((lang, i) => [lang, head(files[i])])),
    );
  } catch {
    return null;
  }
}
