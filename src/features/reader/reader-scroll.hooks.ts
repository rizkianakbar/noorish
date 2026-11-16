import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useIsPhone } from '#/hooks/use-media-query.ts';
import { chromeHiddenStore } from '#/lib/chrome.ts';
import { atPageEnd } from '#/lib/page-scroll.ts';
import type { SurahData } from '#/lib/quran/types.ts';
import { holdInPlace, savedPositions, topVerse } from './reader-scroll.lib.ts';

/**
 * Finding the top verse measures elements; doing that on every frame of a
 * fast flick costs frames, so the position is saved once scrolling pauses.
 */
const SAVE_DELAY_MS = 150;

/**
 * The reader owns its scroll (the router's restoration is off for this
 * route): back/forward and reloads return to the saved verse, a `#v12` link
 * goes to that verse, and anything else starts at the top. Toggling focus
 * mode swaps the verse DOM, so it restores the same verse in the new view.
 */
export function useScrollPosition(
  main: React.RefObject<HTMLElement | null>,
  surahData: SurahData | undefined,
  focusMode: boolean,
) {
  const { key, hash } = useLocation({ select: (l) => ({ key: l.state.__TSR_key ?? l.href, hash: l.hash }) });

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the verse DOM swaps for focus mode
  useEffect(() => {
    const root = main.current;
    if (!root || !surahData) return;
    const saved = savedPositions.get(key);
    const target = document.getElementById(saved?.id ?? hash);
    let release: (() => void) | undefined;
    if (saved && target) {
      window.scrollBy(0, target.getBoundingClientRect().top - saved.top);
      release = holdInPlace(root, saved.id, saved.top);
    } else if (hash && target) {
      target.scrollIntoView({ block: 'start' });
      release = holdInPlace(root, hash, target.getBoundingClientRect().top);
    } else window.scrollTo(0, 0);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const position = topVerse(root);
        savedPositions.delete(key);
        if (position) savedPositions.set(key, position);
      }, SAVE_DELAY_MS);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      release?.();
      clearTimeout(timer);
      window.removeEventListener('scroll', save);
    };
  }, [main, surahData, key, hash, focusMode]);
}

/**
 * How far the page must move before the bars react, so jitter doesn't toggle them.
 */
const SCROLL_THRESHOLD_PX = 10;

/**
 * Near the top the headpiece is in view; the bars always show there.
 */
const TOP_ZONE_PX = 80;

/**
 * Phones: hide the bars while scrolling down, show them on scrolling up,
 * near the top, and at the end of the page.
 */
export function useHideChromeOnScroll(main: React.RefObject<HTMLElement | null>) {
  const isPhone = useIsPhone();

  useEffect(() => {
    if (!main.current || !isPhone) return;
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      // iOS rubber-banding reports negative offsets at the top.
      const y = Math.max(0, window.scrollY);
      if (y < TOP_ZONE_PX || atPageEnd()) {
        lastY = y;
        return chromeHiddenStore.set(false);
      }
      const delta = y - lastY;
      if (Math.abs(delta) < SCROLL_THRESHOLD_PX) return;
      chromeHiddenStore.set(delta > 0);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      chromeHiddenStore.set(false);
    };
  }, [main, isPhone]);
}
