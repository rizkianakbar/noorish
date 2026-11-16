import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches, updating live.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => matchMedia(query).matches,
    // Server-rendered pages draw (and hydrate) the wide layout first.
    () => false,
  );
}

/**
 * Phones get bottom drawers instead of floating sheets and modals.
 */
export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
