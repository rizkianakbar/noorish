/**
 * Downloads the Quran text, word-by-word glosses, translations, and tafsir.
 * Surahs go to `data/quran/` with every language in one file; `bun
 * quran:build` (run after this by `bun quran:fetch`) splits them into the
 * files the reader loads. Tafsir goes straight to `public/quran/tafsir/`.
 *
 * Usage: `bun quran:fetch` (pass `--force` to refetch files that already exist).
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Chapter, SourceSurah, TafsirData, TafsirEntry } from '#/lib/quran/types.ts';

const QURAN_API = 'https://api.quran.com/api/v4';
const QDC_API = 'https://api.qurancdn.com/api/qdc';
const EQURAN_API = 'https://equran.id/api/v2';

const OUT_DIR = join(import.meta.dirname, '../public/quran');
const SURAH_DIR = join(import.meta.dirname, '../data/quran');
// Bundled into the app (page titles need it on the server), so not under public/.
const CHAPTERS_PATH = join(import.meta.dirname, '../src/lib/quran/chapters.json');
// Bundled too: reading plans count in mushaf pages before any surah file loads.
const PAGES_PATH = join(import.meta.dirname, '../src/lib/quran/pages.json');
const TOTAL_PAGES = 604;
const FORCE = process.argv.includes('--force');
const TOTAL_VERSES = 6236;
/**
 * Bump when the surah file shape changes, so existing downloads refresh.
 */
const SURAH_DATA_VERSION = 2;

interface Resource {
  id: number;
  name: string;
  language_name: string;
}

async function getJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url);
  if (res.ok) return res.json() as Promise<T>;
  if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return getJson(url, attempt + 1);
  }
  throw new Error(`GET ${url} failed: ${res.status}`);
}

async function writeJson(path: string, data: unknown) {
  await writeFile(path, JSON.stringify(data));
}

/**
 * Resource IDs are looked up by name so a renumbering upstream fails loudly
 * instead of silently shipping the wrong translation.
 */
function findResource(list: Resource[], name: string, language: string): Resource {
  const found = list.find((r) => r.name === name && r.language_name === language);
  if (!found) throw new Error(`Resource not found: ${name} (${language})`);
  return found;
}

function stripFootnotes(text: string): string {
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchChapters(): Promise<Chapter[]> {
  type ApiChapter = {
    id: number;
    name_arabic: string;
    name_simple: string;
    revelation_place: 'makkah' | 'madinah';
    revelation_order: number;
    bismillah_pre: boolean;
    verses_count: number;
    pages: [number, number];
    translated_name: { name: string };
  };
  const [en, id] = await Promise.all([
    getJson<{ chapters: ApiChapter[] }>(`${QURAN_API}/chapters?language=en`),
    getJson<{ chapters: ApiChapter[] }>(`${QURAN_API}/chapters?language=id`),
  ]);

  return en.chapters.map((c, i) => ({
    number: c.id,
    nameArabic: c.name_arabic,
    nameSimple: c.name_simple,
    nameEn: c.translated_name.name,
    nameId: id.chapters[i].translated_name.name,
    revelationPlace: c.revelation_place,
    revelationOrder: c.revelation_order,
    bismillahPre: c.bismillah_pre,
    versesCount: c.verses_count,
    pages: c.pages,
  }));
}

type ApiWord = {
  position: number;
  char_type_name: string;
  text_uthmani: string;
  translation: { text: string };
  transliteration: { text: string | null };
};
type ApiVerse = {
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  page_number: number;
  juz_number: number;
  words: ApiWord[];
  translations: { resource_id: number; text: string }[];
};

async function fetchVersePages(surah: number, language: 'en' | 'id', translationIds: number[]): Promise<ApiVerse[]> {
  const verses: ApiVerse[] = [];
  for (let page = 1; ; page++) {
    const url =
      `${QDC_API}/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&fields=text_uthmani` +
      `&translations=${translationIds.join(',')}&language=${language}&per_page=50&page=${page}`;
    const data = await getJson<{ verses: ApiVerse[]; pagination: { next_page: number | null } }>(url);
    verses.push(...data.verses);
    if (!data.pagination.next_page) return verses;
  }
}

/**
 * Kemenag's Latin transliteration, the style printed in Indonesian mushafs.
 */
async function fetchKemenagLatin(surah: number): Promise<string[]> {
  const { data } = await getJson<{ data: { ayat: { nomorAyat: number; teksLatin: string }[] } }>(
    `${EQURAN_API}/surat/${surah}`,
  );
  return data.ayat.map((a) => a.teksLatin.trim());
}

interface SurahResources {
  en: Resource;
  id: Resource;
  transliteration: Resource;
}

async function fetchSurah(surah: number, resources: SurahResources): Promise<SourceSurah> {
  const ids = [resources.en.id, resources.id.id, resources.transliteration.id];
  const [enVerses, idVerses, kemenagLatin] = await Promise.all([
    fetchVersePages(surah, 'en', ids),
    fetchVersePages(surah, 'id', ids),
    fetchKemenagLatin(surah),
  ]);
  if (kemenagLatin.length !== enVerses.length) {
    throw new Error(`Surah ${surah}: Kemenag Latin has ${kemenagLatin.length} verses, expected ${enVerses.length}`);
  }

  const verses: SourceSurah['verses'] = enVerses.map((v, i) => {
    const idWords = idVerses[i].words.filter((w) => w.char_type_name === 'word');
    const words = v.words
      .filter((w) => w.char_type_name === 'word')
      .map((w, j) => ({
        a: w.text_uthmani,
        en: w.translation.text.trim(),
        id: idWords[j]?.translation.text.trim() ?? '',
        t: w.transliteration.text?.trim() ?? '',
      }));
    const translationText = (resourceId: number) =>
      stripFootnotes(v.translations.find((t) => t.resource_id === resourceId)?.text ?? '');

    return {
      n: v.verse_number,
      key: v.verse_key,
      arabic: v.text_uthmani,
      page: v.page_number,
      juz: v.juz_number,
      en: translationText(resources.en.id),
      id: translationText(resources.id.id),
      latinEn: translationText(resources.transliteration.id),
      latinId: kemenagLatin[i],
      words,
    };
  });

  return { version: SURAH_DATA_VERSION, surah, verses };
}

/**
 * quran.com repeats one passage under every verse it covers and leaves the
 * others empty; collapse that into a single `from`/`to` entry.
 */
async function fetchIbnKathir(surah: number, tafsir: Resource): Promise<TafsirData> {
  const data = await getJson<{ tafsirs: { verse_key: string; text: string }[] }>(
    `${QURAN_API}/tafsirs/${tafsir.id}/by_chapter/${surah}?per_page=300`,
  );
  const entries: TafsirEntry[] = [];
  for (const t of data.tafsirs) {
    const verse = Number(t.verse_key.split(':')[1]);
    const last = entries.at(-1);
    if (!t.text.trim() && last) last.to = verse;
    else if (last && last.text === t.text) last.to = verse;
    else entries.push({ from: verse, to: verse, text: t.text });
  }
  return { surah, source: 'Ibn Kathir (Abridged)', entries };
}

async function fetchKemenagTafsir(surah: number): Promise<TafsirData> {
  const { data } = await getJson<{ data: { tafsir: { ayat: number; teks: string }[] } }>(
    `${EQURAN_API}/tafsir/${surah}`,
  );
  return {
    surah,
    source: 'Tafsir Kemenag',
    entries: data.tafsir.map((t) => ({ from: t.ayat, to: t.ayat, text: t.teks.trim() })),
  };
}

async function fetchIfMissing(path: string, fetcher: () => Promise<unknown>, isCurrent = () => true) {
  if (!FORCE && existsSync(path) && isCurrent()) return;
  await writeJson(path, await fetcher());
}

/**
 * Surah files written by an older version of this script lack newer fields
 * (e.g. transliteration) and are refetched; tafsir files are left alone.
 */
/**
 * Where each mushaf page begins, as [surah, verse], from the `page` field of
 * the surah files.
 */
function pageStarts(chapters: Chapter[]): [number, number][] {
  const starts: [number, number][] = [];
  for (const chapter of chapters) {
    const { verses } = JSON.parse(readFileSync(join(SURAH_DIR, `${chapter.number}.json`), 'utf8')) as SourceSurah;
    for (const verse of verses) {
      if (verse.page > starts.length) starts.push([chapter.number, verse.n]);
    }
  }
  if (starts.length !== TOTAL_PAGES) throw new Error(`Expected ${TOTAL_PAGES} pages, got ${starts.length}`);
  return starts;
}

function isCurrentSurahFile(path: string): boolean {
  try {
    return JSON.parse(readFileSync(path, 'utf8')).version === SURAH_DATA_VERSION;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(SURAH_DIR, { recursive: true });
  await mkdir(join(OUT_DIR, 'tafsir/ibn-kathir'), { recursive: true });
  await mkdir(join(OUT_DIR, 'tafsir/kemenag'), { recursive: true });

  const [{ translations }, { tafsirs }] = await Promise.all([
    getJson<{ translations: Resource[] }>(`${QURAN_API}/resources/translations`),
    getJson<{ tafsirs: Resource[] }>(`${QURAN_API}/resources/tafsirs`),
  ]);
  const resources = {
    en: findResource(translations, 'Saheeh International', 'english'),
    id: findResource(translations, 'Indonesian Islamic Affairs Ministry', 'indonesian'),
    transliteration: findResource(translations, 'Transliteration', 'english'),
  };
  const ibnKathir = findResource(tafsirs, 'Ibn Kathir (Abridged)', 'english');

  const chapters = await fetchChapters();
  if (chapters.length !== 114) throw new Error(`Expected 114 chapters, got ${chapters.length}`);
  await writeJson(CHAPTERS_PATH, chapters);

  let verseTotal = 0;
  for (const chapter of chapters) {
    const n = chapter.number;
    const surahPath = join(SURAH_DIR, `${n}.json`);
    await fetchIfMissing(
      surahPath,
      async () => {
        const surah = await fetchSurah(n, resources);
        if (surah.verses.length !== chapter.versesCount) {
          throw new Error(`Surah ${n}: expected ${chapter.versesCount} verses, got ${surah.verses.length}`);
        }
        return surah;
      },
      () => isCurrentSurahFile(surahPath),
    );
    await fetchIfMissing(join(OUT_DIR, `tafsir/ibn-kathir/${n}.json`), () => fetchIbnKathir(n, ibnKathir));
    await fetchIfMissing(join(OUT_DIR, `tafsir/kemenag/${n}.json`), () => fetchKemenagTafsir(n));
    verseTotal += chapter.versesCount;
    process.stdout.write(`\r${n}/114 surahs`);
  }

  if (verseTotal !== TOTAL_VERSES) throw new Error(`Expected ${TOTAL_VERSES} verses, got ${verseTotal}`);
  await writeJson(PAGES_PATH, pageStarts(chapters));
  console.log(`\nDone — ${verseTotal} verses written to ${SURAH_DIR}`);
}

await main();
