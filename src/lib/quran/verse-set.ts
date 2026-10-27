import chapters from './chapters.json' with { type: 'json' };
import pageStartRefs from './pages.json' with { type: 'json' };

export const TOTAL_VERSES = 6236;
export const TOTAL_PAGES = 604;

/**
 * Index of each surah's first verse in mushaf order (0-based, over all 6236).
 */
const surahOffsets: number[] = [];
let offset = 0;
for (const chapter of chapters) {
  surahOffsets.push(offset);
  offset += chapter.versesCount;
}

export function verseIndex(surah: number, verse: number): number {
  return surahOffsets[surah - 1] + verse - 1;
}

export function verseAt(index: number): { surah: number; verse: number } {
  let surah = 1;
  while (surah < surahOffsets.length && surahOffsets[surah] <= index) surah++;
  return { surah, verse: index - surahOffsets[surah - 1] + 1 };
}

/**
 * Verse index each mushaf page starts at; page `p` (1-based) covers
 * `pageStarts[p - 1]` up to the next page's start.
 */
export const pageStarts: number[] = pageStartRefs.map(([surah, verse]) => verseIndex(surah, verse));

export function pageRange(page: number): { start: number; end: number } {
  return { start: pageStarts[page - 1], end: page < TOTAL_PAGES ? pageStarts[page] : TOTAL_VERSES };
}

/**
 * A set of verses as a bitset, base64-encoded for storage and sync: 780
 * bytes covers the whole Quran. Unions merge two devices without losing
 * either one's reading.
 */
export type VerseSet = Uint8Array;

const SET_BYTES = Math.ceil(TOTAL_VERSES / 8);

export function emptyVerseSet(): VerseSet {
  return new Uint8Array(SET_BYTES);
}

export function hasVerse(set: VerseSet, index: number): boolean {
  return (set[index >> 3] & (1 << (index & 7))) !== 0;
}

export function addVerse(set: VerseSet, index: number): void {
  set[index >> 3] |= 1 << (index & 7);
}

export function unionVerseSets(a: VerseSet, b: VerseSet): VerseSet {
  return a.map((byte, i) => byte | b[i]);
}

export function countVerses(set: VerseSet): number {
  let count = 0;
  for (let byte of set) {
    while (byte) {
      byte &= byte - 1;
      count++;
    }
  }
  return count;
}

export function encodeVerseSet(set: VerseSet): string {
  let binary = '';
  for (const byte of set) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Decodes a stored set; anything malformed decodes to the empty set.
 */
export function decodeVerseSet(encoded: string): VerseSet {
  const set = emptyVerseSet();
  try {
    const binary = atob(encoded);
    for (let i = 0; i < Math.min(binary.length, SET_BYTES); i++) set[i] = binary.charCodeAt(i);
  } catch {
    // Fall through with the empty set.
  }
  return set;
}
