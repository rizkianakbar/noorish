import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { skipVerse, stop, togglePause } from '#/features/audio/audio.lib.ts';
import { registerServiceWorker } from '#/features/pwa/pwa.lib.ts';
import { onIdle } from '#/lib/idle.ts';
import {
  arabicFonts,
  closeDock,
  darkThemes,
  dockStore,
  stepArabicSize,
  stepPlaybackRate,
  toggleDock,
  usePrefs,
} from '#/lib/prefs.ts';
import { getSurah } from '#/lib/quran/data.ts';
import { useShortcut } from '#/lib/shortcuts.ts';

/**
 * Mirror theme, language and Arabic type preferences onto <html>.
 */
export function useApplyPrefs() {
  const prefs = usePrefs();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.classList.toggle('dark', darkThemes.has(prefs.theme));
    root.lang = prefs.language;
    root.style.setProperty('--arabic-font', arabicFonts[prefs.arabicFont].family);
    root.style.setProperty('--arabic-size', `${prefs.arabicSize}rem`);
  }, [prefs.theme, prefs.language, prefs.arabicFont, prefs.arabicSize]);
}

// Counted from the window load event, so the open page's own surah, fonts
// and audio never share the network with the background prefetch.
const PREFETCH_START_MS = 5000;

function onSlowOrMeteredConnection(): boolean {
  const { connection } = navigator as { connection?: { saveData?: boolean; effectiveType?: string } };
  return !!connection?.saveData || (!!connection?.effectiveType && connection.effectiveType !== '4g');
}

/**
 * Once the app settles, pull every surah into memory one at a time while the
 * browser is idle (~11 MB of JSON), so opening any surah after that is a
 * memory read: no fetch, no parse, no skeleton. Skipped on Save-Data or a
 * slow connection.
 */
export function usePrefetchAllSurahs() {
  useEffect(() => {
    if (onSlowOrMeteredConnection()) return;
    let cancelled = false;
    let cancelIdle = () => {};
    let n = 1;
    const next = () => {
      if (cancelled || n > 114) return;
      void getSurah(n++)
        .catch(() => {})
        .finally(() => {
          cancelIdle = onIdle(next);
        });
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      timer = setTimeout(next, PREFETCH_START_MS);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', start);
      clearTimeout(timer);
      cancelIdle();
    };
  }, []);
}

/**
 * App-wide shortcuts. Pages register their own on top (see `useShortcut`).
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useShortcut('playPause', togglePause);
  useShortcut('stop', stop);
  useShortcut('prevRecited', () => skipVerse(-1));
  useShortcut('nextRecited', () => skipVerse(1));
  useShortcut('slower', () => stepPlaybackRate(-1));
  useShortcut('faster', () => stepPlaybackRate(1));
  useShortcut('biggerText', () => stepArabicSize(1));
  useShortcut('smallerText', () => stepArabicSize(-1));
  useShortcut('surahIndex', () => toggleDock('surahs'));
  useShortcut('search', () => dockStore.set('search'));
  useShortcut('journal', () => toggleDock('journal'));
  useShortcut('help', () => toggleDock('shortcuts'));
  useShortcut('home', () => navigate({ to: '/' }));
  useShortcut('settings', () => navigate({ to: '/settings' }));
  useShortcut('close', (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) event.target.blur();
    closeDock();
  });
}

/**
 * Register the service worker once the page has settled, so installing it
 * (which downloads the app's files, ~1.3 MB) never competes with the first
 * load. A first install waits for a fast, unmetered connection, like the
 * surah prefetch; a worker already installed always registers, since that
 * is also how it finds updates.
 */
export function useServiceWorker() {
  useEffect(
    () =>
      onIdle(
        () => {
          const installed = !!navigator.serviceWorker?.controller;
          if (!installed && onSlowOrMeteredConnection()) return;
          void registerServiceWorker().catch(() => {});
        },
        { timeout: 5000, fallbackDelay: 3000 },
      ),
    [],
  );
}

/**
 * Keep prayer notifications in step (schedule, logged prayers), loading
 * that code only for readers who turned them on.
 */
export function usePrayerPush(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    return onIdle(() => void import('#/features/prayer/prayer.push.ts').then((push) => push.startPrayerPush()), {
      timeout: 4000,
      fallbackDelay: 2000,
    });
  }, [enabled]);
}
