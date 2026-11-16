import { createStore } from './store.ts';

export type Language = 'en' | 'id';
export type Theme = 'light' | 'dark' | 'sepia' | 'night';
export type ArabicFont = 'amiri' | 'scheherazade' | 'noto';
/**
 * 'auto' follows the UI language; 'off' hides translations.
 */
export type TranslationPref = 'auto' | 'en' | 'id' | 'off';
/**
 * 'kemenag' is the marked transliteration printed in Indonesian mushafs;
 * 'simple' drops the diacritics for readers who find them distracting.
 */
export type LatinStyle = 'kemenag' | 'simple';
/**
 * The sheets that rise out of the dock.
 */
export type DockView = 'surahs' | 'search' | 'journal' | 'shortcuts';

export const themes: Theme[] = ['light', 'dark', 'sepia', 'night'];
export const darkThemes = new Set<Theme>(['dark', 'night']);

/**
 * Each theme's `--background` (styles.css) as hex, for the browser's
 * `theme-color`, so the status bar matches the page.
 */
export const themeColors: Record<Theme, string> = {
  light: '#f2f4f6',
  dark: '#09152c',
  sepia: '#f6ebdb',
  night: '#000000',
};

/**
 * Point the `theme-color` meta tag at a theme, creating the tag if needed.
 */
export function applyThemeColor(theme: Theme) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = themeColors[theme];
}

export const arabicFonts: Record<ArabicFont, { label: string; family: string }> = {
  amiri: { label: 'Amiri Quran', family: "'Amiri Quran'" },
  scheherazade: { label: 'Scheherazade New', family: "'Scheherazade New'" },
  noto: { label: 'Noto Naskh Arabic', family: "'Noto Naskh Arabic'" },
};

export interface Prefs {
  language: Language;
  theme: Theme;
  arabicFont: ArabicFont;
  /**
   * Arabic text size in rem.
   */
  arabicSize: number;
  translation: TranslationPref;
  /**
   * Show a Latin transliteration under each verse.
   */
  latin: boolean;
  latinStyle: LatinStyle;
  wordByWord: boolean;
  focusMode: boolean;
  reciter: number;
  /**
   * Recitation speed; pitch is preserved.
   */
  playbackRate: number;
  /**
   * Show the reading plan's "Today's reading" card on the home page.
   */
  planOnHome: boolean;
}

const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

export const prefsStore = createStore<Prefs>(
  {
    // Optional chaining: some server runtimes (Bun) have a navigator without a language.
    language: typeof navigator !== 'undefined' && navigator.language?.startsWith('id') ? 'id' : 'en',
    theme: prefersDark ? 'dark' : 'light',
    arabicFont: 'amiri',
    arabicSize: 2,
    translation: 'auto',
    latin: true,
    latinStyle: 'kemenag',
    wordByWord: true,
    focusMode: false,
    reciter: 7,
    playbackRate: 1,
    planOnHome: true,
  },
  { key: 'quran:prefs' },
);

export function usePrefs() {
  return prefsStore.use();
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefsStore.set((prev) => ({ ...prev, [key]: value }));
}

/**
 * Which translation to show, resolving 'auto' against the UI language.
 */
export function resolveTranslation(prefs: Prefs): Language | null {
  if (prefs.translation === 'off') return null;
  return prefs.translation === 'auto' ? prefs.language : prefs.translation;
}

/**
 * Arabic text size bounds and step, in rem.
 */
export const arabicSizeRange = { min: 1.25, max: 3.5, step: 0.125 };

/**
 * Grow (1) or shrink (-1) the Arabic text by one step, within bounds.
 */
export function stepArabicSize(direction: 1 | -1) {
  const { min, max, step } = arabicSizeRange;
  const next = prefsStore.get().arabicSize + direction * step;
  setPref('arabicSize', Math.min(max, Math.max(min, next)));
}

export const playbackRates = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * Step the recitation speed one notch slower (-1) or faster (1); with
 * `wrap`, stepping past the fastest returns to the slowest (the pill's
 * single tap-to-cycle button).
 */
export function stepPlaybackRate(direction: 1 | -1, opts: { wrap?: boolean } = {}) {
  const current = playbackRates.indexOf(prefsStore.get().playbackRate);
  const from = current === -1 ? playbackRates.indexOf(1) : current;
  const next = opts.wrap
    ? (from + direction + playbackRates.length) % playbackRates.length
    : Math.min(Math.max(from + direction, 0), playbackRates.length - 1);
  setPref('playbackRate', playbackRates[next]);
}

export function formatRate(rate: number): string {
  return `${rate}×`;
}

/**
 * The transliteration to show for a verse, or null when Latin is off.
 */
export function resolveLatin(prefs: Prefs, verse: { latinId: string; latinEn: string }): string | null {
  if (!prefs.latin) return null;
  return prefs.latinStyle === 'kemenag' ? verse.latinId : verse.latinEn;
}

/**
 * Session-only: which dock sheet is open, if any.
 */
export const dockStore = createStore<DockView | null>(null);

/**
 * Pressing the open sheet's button closes it; any other opens that sheet.
 */
export function toggleDock(view: DockView) {
  dockStore.set((current) => (current === view ? null : view));
}

export function closeDock() {
  dockStore.set(null);
}
