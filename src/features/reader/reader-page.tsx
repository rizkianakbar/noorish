import { ClientOnly } from '@tanstack/react-router';
import { useRef } from 'react';
import { SurahEnd } from '#/components/ornament/dividers.tsx';
import { useReaderFontsReady } from '#/hooks/use-reader-fonts-ready.ts';
import { authClient } from '#/lib/auth-client.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { useChapters, useSurah } from '#/lib/quran/data.ts';
import type { SurahData } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import {
  useReaderShortcuts,
  useReadingTracker,
  useSurahPlayback,
  useVerseAnnotations,
  useWarmSurah,
  useWordSelection,
} from './reader.hooks.ts';
import { ReaderBismillah } from './reader-bismillah.tsx';
import { ReaderLoadError } from './reader-fallbacks.tsx';
import { useFollowRecitation } from './reader-follow.hooks.ts';
import { ReaderHeader } from './reader-header.tsx';
import { RunningHead } from './reader-running-head.tsx';
import { useHideChromeOnScroll, useScrollPosition } from './reader-scroll.hooks.ts';
import { ReaderSurahNav } from './reader-surah-nav.tsx';
import { ReaderVerses } from './reader-verses.tsx';
import { WordPopover } from './reader-word-popover.tsx';

export function ReaderPage({ surah, preview }: { surah: number; preview: SurahData | null }) {
  const prefs = usePrefs();
  const { data: chapters, isError: chaptersMissing } = useChapters();
  const loaded = useSurah(surah);
  // A server-rendered page shows its opening verses until the full surah lands.
  const prerendered = !loaded && preview?.surah === surah;
  const surahData = loaded ?? (prerendered ? preview : undefined);
  const fontsReady = useReaderFontsReady(prefs.arabicFont);
  const signedIn = !!authClient.useSession().data;
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const chapter = chapters?.[surah - 1];
  const prev = surah > 1 ? chapters?.[surah - 2] : undefined;
  const next = surah < 114 ? chapters?.[surah] : undefined;

  const annotations = useVerseAnnotations(surah, signedIn);
  const { selection, handlers, onPopoverLeave } = useWordSelection(surahData);
  const { controls, togglePlayback } = useSurahPlayback(surah);

  useReadingTracker(mainRef, surahData, prefs.focusMode);
  useWarmSurah(surah);
  useScrollPosition(mainRef, surahData, prefs.focusMode);
  useHideChromeOnScroll(mainRef);
  useFollowRecitation(mainRef, surah);
  useReaderShortcuts({ main: mainRef, surah, prev, next, togglePlayback });

  if (chaptersMissing) return <ReaderLoadError />;

  return (
    <>
      <main ref={mainRef} id="main-content" tabIndex={-1} {...handlers} className="min-w-0 grow outline-none">
        <ClientOnly>
          {chapter && <RunningHead chapter={chapter} headerRef={headerRef} rootRef={mainRef} controls={controls} />}
        </ClientOnly>
        {/* Laid out but transparent until the fonts land, so their swap reflows nothing anyone sees. */}
        <div
          className={cn(
            'mx-auto max-w-3xl px-4 pb-40 transition-opacity duration-300 ease-out sm:px-6 lg:px-10',
            !fontsReady && 'opacity-0',
          )}>
          {chapter ? (
            <ReaderHeader ref={headerRef} chapter={chapter} controls={controls} />
          ) : (
            <div className="mt-8 mb-10 aspect-1000/240 w-full animate-pulse rounded-2xl bg-muted sm:mt-10" />
          )}
          {chapter?.bismillahPre && <ReaderBismillah allVariants={prerendered} />}
          {surahData && (
            <ReaderVerses
              key={surah}
              surahData={surahData}
              chapter={chapter}
              selection={selection}
              signedIn={signedIn}
              noteByVerse={annotations.noteByVerse}
              bookmarkedVerses={annotations.bookmarkedVerses}
              onToggleBookmark={annotations.toggleBookmark}
              prerendered={prerendered}
              fadeIn={preview?.surah !== surah}
            />
          )}
          {/* The end matter waits for the verses, or it flashes under the header while they load. */}
          {chapter && loaded && <SurahEnd surah={surah} name={chapter.nameSimple} />}
          {loaded && <ReaderSurahNav prev={prev} next={next} />}
        </div>
      </main>

      {selection && prefs.wordByWord && (
        <WordPopover surah={surah} selection={selection} language={prefs.language} onPointerLeave={onPopoverLeave} />
      )}
    </>
  );
}
