import { useHydrated } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { loadReaderFonts, readerFontsReady } from '#/lib/fonts.ts';
import type { ArabicFont } from '#/lib/prefs.ts';

/**
 * True once the reader's fonts have loaded; synchronously true on later pages.
 * Also true while a server-rendered page hydrates: its text is already on
 * screen (the fonts were preloaded with it), so hiding it would only flicker.
 */
export function useReaderFontsReady(font: ArabicFont): boolean {
  const hydrated = useHydrated();
  // Read once: a page the server drew stays shown through the swap that follows.
  const [serverDrawn] = useState(() => !hydrated);
  const [loaded, setLoaded] = useState(() => readerFontsReady(font));

  useEffect(() => {
    let cancelled = false;
    void loadReaderFonts(font).then(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [font]);

  return serverDrawn || loaded || readerFontsReady(font);
}
