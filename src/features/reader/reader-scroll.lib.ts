/**
 * How long a verse is held in place while the page around it settles.
 */
const SETTLE_MS = 1500;

/**
 * Keep the element `id` at `top` px from the viewport top while content
 * around it settles: off-screen cards start at an estimated height and take
 * their real one as they near the screen, which would otherwise push the
 * verse being read away. Resize observers fire after layout and before
 * paint, so the correction is never seen. Stops as soon as the reader scrolls.
 */
export function holdInPlace(root: HTMLElement, id: string, top: number): () => void {
  const align = () => {
    // Looked up each time, in case React replaced the element meanwhile.
    const el = document.getElementById(id);
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - top);
  };
  const observer = new ResizeObserver(align);
  for (const child of root.children) observer.observe(child);
  const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  const release = () => {
    observer.disconnect();
    clearTimeout(timer);
    for (const type of inputs) window.removeEventListener(type, release);
  };
  const timer = setTimeout(release, SETTLE_MS);
  for (const type of inputs) window.addEventListener(type, release, { passive: true });
  return release;
}

/**
 * A verse's position in the reader: its element id and its offset from the
 * viewport top. Positions are saved per history entry by verse, not pixels:
 * on a fresh mount the cards above haven't been measured yet, so a pixel
 * offset lands on the wrong verse.
 */
export interface VersePosition {
  id: string;
  top: number;
}

const POSITIONS_KEY = 'surah-scroll';
const MAX_POSITIONS = 50;

/**
 * Saved positions by history entry key; kept for the session, so reloads
 * and back/forward return to the same verse.
 */
export const savedPositions: Map<string, VersePosition> = (() => {
  try {
    return new Map(JSON.parse(sessionStorage.getItem(POSITIONS_KEY) ?? '[]'));
  } catch {
    return new Map();
  }
})();

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(POSITIONS_KEY, JSON.stringify([...savedPositions].slice(-MAX_POSITIONS)));
    } catch {
      // Storage blocked: positions just don't survive a reload.
    }
  });
}

const VERSE_ID = /^v\d+$/;

/**
 * The verse at the top of the reader, or null at the very top.
 */
export function topVerse(root: HTMLElement): VersePosition | null {
  if (window.scrollY === 0) return null;
  // Mushaf pages above the screen are skipped whole: measuring a verse inside
  // one would force layout of a page `content-visibility` is skipping.
  let passedSheet: Element | null = null;
  for (const el of root.querySelectorAll<HTMLElement>('[id^="v"]')) {
    if (!VERSE_ID.test(el.id)) continue;
    const sheet = el.closest('.mushaf-sheet');
    if (sheet && sheet === passedSheet) continue;
    if (sheet && sheet.getBoundingClientRect().bottom <= 0) {
      passedSheet = sheet;
      continue;
    }
    const rect = el.getBoundingClientRect();
    if (rect.bottom > 0) return { id: el.id, top: rect.top };
  }
  return null;
}
