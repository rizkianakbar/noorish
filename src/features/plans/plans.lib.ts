import {
  addVerse,
  countVerses,
  decodeVerseSet,
  emptyVerseSet,
  encodeVerseSet,
  hasVerse,
  pageRange,
  TOTAL_PAGES,
  TOTAL_VERSES,
  unionVerseSets,
  type VerseSet,
  verseAt,
  verseIndex,
} from '#/lib/quran/verse-set.ts';
import type { PlanDay, ReadingPlan } from './plans.types.ts';

export const PLAN_LENGTHS = [30, 60, 90] as const;

const DAY_MS = 86_400_000;

function utc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Whole days from one `YYYY-MM-DD` key to another (negative if `to` is earlier).
 */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

export function addDays(key: string, days: number): string {
  return new Date(utc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * A khatam plan starting today and finishing on `endDate` (inclusive).
 */
export function createPlan(today: string, endDate: string, now = new Date()): ReadingPlan {
  return {
    id: crypto.randomUUID(),
    startDate: today,
    endDate,
    read: encodeVerseSet(emptyVerseSet()),
    today: null,
    completedAt: null,
    createdAt: now.toISOString(),
  };
}

function isPageRead(set: VerseSet, page: number): boolean {
  const { start, end } = pageRange(page);
  for (let i = start; i < end; i++) if (!hasVerse(set, i)) return false;
  return true;
}

function unreadPages(set: VerseSet): number[] {
  const pages: number[] = [];
  for (let page = 1; page <= TOTAL_PAGES; page++) if (!isPageRead(set, page)) pages.push(page);
  return pages;
}

/**
 * Today's portion: the pages left, shared evenly over the days left, taken
 * from the first unread page on. A missed day spreads over the rest of the
 * plan instead of piling onto tomorrow; past the end date, everything left
 * is today's. Fixed once per day (see `withToday`), so reading doesn't
 * shrink the target as you go.
 */
function portionFor(plan: ReadingPlan, today: string): PlanDay | null {
  if (plan.today?.date === today) return plan.today;
  const unread = unreadPages(decodeVerseSet(plan.read));
  if (unread.length === 0) return null;
  const daysLeft = Math.max(1, daysBetween(today, plan.endDate) + 1);
  const portion = unread.slice(0, Math.ceil(unread.length / daysLeft));
  return { date: today, fromPage: portion[0], toPage: portion[portion.length - 1] };
}

/**
 * The plan with today's portion fixed, or the same plan if it already is.
 */
export function withToday(plan: ReadingPlan, today: string): ReadingPlan {
  if (plan.completedAt || plan.today?.date === today) return plan;
  return { ...plan, today: portionFor(plan, today) };
}

/**
 * The plan with one more verse read, or the same plan if it already was.
 */
export function withVerseRead(plan: ReadingPlan, surah: number, verse: number, now = new Date()): ReadingPlan {
  const set = decodeVerseSet(plan.read);
  const index = verseIndex(surah, verse);
  if (hasVerse(set, index)) return plan;
  addVerse(set, index);
  const completedAt = plan.completedAt ?? (countVerses(set) === TOTAL_VERSES ? now.toISOString() : null);
  return { ...plan, read: encodeVerseSet(set), completedAt };
}

export interface PlanSummary {
  pagesRead: number;
  /**
   * 1-based day of the plan; can pass `totalDays` once the end date is behind.
   */
  day: number;
  totalDays: number;
  daysLeft: number;
  portion: PlanDay | null;
  portionRead: number;
  portionPages: number;
  /**
   * Where to resume: the first unread verse of today's portion, else of the Quran.
   */
  next: { surah: number; verse: number } | null;
}

export function summarizePlan(plan: ReadingPlan, today: string): PlanSummary {
  const set = decodeVerseSet(plan.read);
  const portion = plan.completedAt ? null : portionFor(plan, today);
  let pagesRead = 0;
  for (let page = 1; page <= TOTAL_PAGES; page++) if (isPageRead(set, page)) pagesRead++;

  let portionRead = 0;
  let next: PlanSummary['next'] = null;
  if (portion) {
    for (let page = portion.fromPage; page <= portion.toPage; page++) {
      if (isPageRead(set, page)) portionRead++;
      else if (!next) {
        const { start, end } = pageRange(page);
        for (let i = start; i < end && !next; i++) if (!hasVerse(set, i)) next = verseAt(i);
      }
    }
  }
  if (!next && !plan.completedAt) {
    for (let i = 0; i < TOTAL_VERSES && !next; i++) if (!hasVerse(set, i)) next = verseAt(i);
  }

  return {
    pagesRead,
    day: daysBetween(plan.startDate, today) + 1,
    totalDays: daysBetween(plan.startDate, plan.endDate) + 1,
    daysLeft: Math.max(0, daysBetween(today, plan.endDate) + 1),
    portion,
    portionRead,
    portionPages: portion ? portion.toPage - portion.fromPage + 1 : 0,
    next,
  };
}

/**
 * Combine two copies of the same plan (this device's and the account's):
 * reading is unioned, settings come from `preferred`.
 */
export function mergePlans(preferred: ReadingPlan, other: ReadingPlan): ReadingPlan {
  return {
    ...preferred,
    read: encodeVerseSet(unionVerseSets(decodeVerseSet(preferred.read), decodeVerseSet(other.read))),
    completedAt: preferred.completedAt ?? other.completedAt,
  };
}
