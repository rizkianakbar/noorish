import { type KeyboardEvent, memo, Suspense, useState } from 'react';
import { MarginMarker, SajdahNote } from '#/components/ornament/marginalia.tsx';
import { toggleVerse } from '#/features/audio/audio.lib.ts';
import { lazyOnIdle } from '#/lib/idle.ts';
import type { Language } from '#/lib/prefs.ts';
import { isSajdah } from '#/lib/quran/sajdah.ts';
import { QURAN_LANGS } from '#/lib/quran/surah-files.ts';
import type { Verse } from '#/lib/quran/types.ts';
import { useCopyVerseLink, useLazyDrawer } from './verse-card.hooks.ts';
import { VerseActions } from './verse-card-actions.tsx';
import { VerseArabic } from './verse-card-arabic.tsx';
import { RecitingOrnament } from './verse-card-ornament.tsx';

// Opened from a verse, not shown with it: off the surah's first load (the note
// form alone brings zod and react-hook-form), fetched once the page is idle.
const NoteEditor = lazyOnIdle(() =>
  import('#/features/notes/note-editor.tsx').then((m) => ({ default: m.NoteEditor })),
);
const TafsirPanel = lazyOnIdle(() =>
  import('#/features/tafsir/tafsir-panel.tsx').then((m) => ({ default: m.TafsirPanel })),
);
const VerseMoreSheet = lazyOnIdle(() =>
  import('./verse-card-more-sheet.tsx').then((m) => ({ default: m.VerseMoreSheet })),
);

const LATIN_CLASS = 'mt-4 max-w-[65ch] font-serif text-[1.0625rem] leading-[1.7] text-gold-ink italic';
const TRANSLATION_CLASS = 'mt-4 max-w-[65ch] font-serif text-[1.0625rem] leading-[1.75] text-foreground/80';

export interface VerseCardProps {
  surah: number;
  verse: Verse;
  /**
   * Within a couple of screens of the viewport (see `useNearVerses`).
   */
  near: boolean;
  translation: Language | null;
  /**
   * Transliteration to show under the Arabic, or null when Latin is off.
   */
  latin: string | null;
  /**
   * Recitation state, only set on the verse being recited so the other
   * cards' props stay stable and memo skips them on every word tick.
   */
  recitation: { word: number | null; playing: boolean; loading: boolean } | null;
  selectedWords: { from: number; to: number } | null;
  bookmarked: boolean;
  note: string | null;
  signedIn: boolean;
  onToggleBookmark: (verse: number) => void;
  /**
   * Draw every translation and transliteration, for the server-rendered page,
   * which can't know the reader's choice; CSS shows theirs.
   */
  allVariants?: boolean;
}

export const VerseCard = memo(function VerseCard({
  surah,
  verse,
  near,
  translation,
  latin,
  recitation,
  selectedWords,
  bookmarked,
  note,
  signedIn,
  onToggleBookmark,
  allVariants = false,
}: VerseCardProps) {
  const sajdah = isSajdah(verse.key);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { copied, copyLink } = useCopyVerseLink(surah, verse.n);
  const more = useLazyDrawer();
  // Far cards are the same text without the per-word spans or the actions
  // row: Al-Baqarah in full was 39k DOM nodes, slow to mount and to scroll.
  // The full card mounts two screens ahead, or whenever it is in use.
  const hydrated = near || !!recitation || !!selectedWords || tafsirOpen || editing || more.open;

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'p') toggleVerse(surah, verse.n);
    else if (event.key === 't') setTafsirOpen((open) => !open);
    else if (event.key === 'c') void copyLink();
    else if (event.key === 'b' && signedIn) onToggleBookmark(verse.n);
    else if (event.key === 'n' && signedIn) setEditing((open) => !open);
    else return;
    event.preventDefault();
  }

  return (
    // The marker sits outside the article: `.verse-card` uses content-visibility,
    // whose paint containment would clip anything drawn in the margin.
    <div className="relative">
      <MarginMarker verse={verse.n} sajdah={sajdah} />
      <article
        id={`v${verse.n}`}
        data-verse={verse.n}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: verses take focus so j/k and the per-verse keys (P, T, C, B, N) work
        tabIndex={0}
        aria-label={verse.key}
        onKeyDown={onKeyDown}
        data-reciting={recitation ? '' : undefined}
        className="verse-card group relative -mx-4 scroll-mt-6 px-4 py-8 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:-mx-6 sm:px-6">
        {recitation && <RecitingOrnament playing={recitation.playing} />}
        <VerseArabic
          verse={verse}
          interactive={hydrated}
          recitedWord={recitation ? recitation.word : undefined}
          selectedWords={selectedWords}
        />

        {allVariants ? (
          // Server-rendered: every variant, and CSS shows the reader's (see styles.css).
          <>
            <p lang="ar-Latn" data-show-latin="kemenag" className={LATIN_CLASS}>
              {verse.latinId}
            </p>
            <p lang="ar-Latn" data-show-latin="simple" className={LATIN_CLASS}>
              {verse.latinEn}
            </p>
            {QURAN_LANGS.map((lang) => (
              <p key={lang} lang={lang} data-show-tr={lang} className={TRANSLATION_CLASS}>
                {verse[lang]}
              </p>
            ))}
          </>
        ) : (
          <>
            {latin && (
              <p lang="ar-Latn" className={LATIN_CLASS}>
                {latin}
              </p>
            )}
            {translation && <p className={TRANSLATION_CLASS}>{verse[translation]}</p>}
          </>
        )}

        {sajdah && <SajdahNote />}

        {note && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 block w-full rounded-r-lg border-l-2 border-gold bg-gold/8 px-4 py-2.5 text-left font-serif text-sm whitespace-pre-line text-foreground/75 italic">
            {note}
          </button>
        )}

        {hydrated ? (
          <VerseActions
            surah={surah}
            verse={verse.n}
            verseKey={verse.key}
            recitation={recitation}
            signedIn={signedIn}
            bookmarked={bookmarked}
            tafsirOpen={tafsirOpen}
            editing={editing}
            copied={copied}
            onToggleTafsir={() => setTafsirOpen((open) => !open)}
            onToggleNote={() => setEditing((open) => !open)}
            onCopyLink={copyLink}
            onOpenMore={() => more.setOpen(true)}
            onToggleBookmark={() => onToggleBookmark(verse.n)}
          />
        ) : (
          // The actions row's height (its h-6 buttons), held until it mounts.
          <div aria-hidden="true" className="mt-3 h-6" />
        )}

        <Suspense fallback={null}>
          {more.mounted && (
            <VerseMoreSheet
              open={more.open}
              onOpenChange={more.setOpen}
              verseKey={verse.key}
              signedIn={signedIn}
              copied={copied}
              onCopyLink={copyLink}
              onNote={() => setEditing(true)}
            />
          )}

          {editing && (
            <NoteEditor surah={surah} verse={verse.n} initialBody={note ?? ''} onDone={() => setEditing(false)} />
          )}
          {tafsirOpen && <TafsirPanel surah={surah} verse={verse.n} />}
        </Suspense>
      </article>
    </div>
  );
});
