/**
 * Verses that stand on their own (no "and they said…" fragments), for the
 * home page's verse of the day.
 */
export const DAILY_VERSES: readonly (readonly [surah: number, verse: number])[] = [
  [2, 45],
  [2, 152],
  [2, 153],
  [2, 156],
  [2, 186],
  [2, 201],
  [2, 286],
  [3, 8],
  [3, 139],
  [3, 200],
  [4, 28],
  [6, 162],
  [7, 23],
  [9, 51],
  [13, 28],
  [14, 7],
  [14, 40],
  [15, 99],
  [16, 97],
  [18, 10],
  [20, 46],
  [20, 114],
  [21, 87],
  [25, 63],
  [25, 74],
  [29, 69],
  [33, 41],
  [35, 15],
  [39, 53],
  [40, 60],
  [42, 19],
  [47, 7],
  [49, 13],
  [50, 16],
  [51, 56],
  [55, 13],
  [59, 22],
  [64, 11],
  [93, 5],
  [94, 5],
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days since the epoch for the local calendar day: the same all day, for everyone.
 */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

/**
 * The same verse all day (local time) for everyone, a different one tomorrow.
 */
export function verseOfTheDay(date: Date): { surah: number; verse: number } {
  const [surah, verse] = DAILY_VERSES[dayNumber(date) % DAILY_VERSES.length];
  return { surah, verse };
}
