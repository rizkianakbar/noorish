import { memo } from 'react';
import { starOutline } from '#/components/ornament/geometry.ts';
import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { useT } from '#/lib/i18n.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import type { Chapter, Verse } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import type { MushafPage } from './mushaf.lib.ts';
import { reciteState } from './reader-recite.lib.ts';

export interface Recitation {
  verse: number | null;
  word: number | null;
}

function CornerRosette({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('absolute size-3.5 sm:size-4', className)}>
      <path
        d={starOutline({ cx: 10, cy: 10, r: 9.5, inner: 6, n: 8 })}
        className="fill-(--paper) stroke-gold"
        strokeWidth={1}
      />
      <circle cx="10" cy="10" r="2.2" className="fill-gold" />
    </svg>
  );
}

/**
 * The illuminated frame: a lattice band between two gold rules, a rosette
 * at each corner. Fixed insets, so it hugs a sheet of any height.
 */
function Frame() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-2 sm:inset-3">
      <div className="absolute inset-0 rounded-[3px] ring-1 ring-gold/70" />
      <div className="mushaf-band absolute inset-0.75">
        <Lattice size={14} className="opacity-90" />
      </div>
      <div className="absolute inset-2.75 rounded-xs ring-1 ring-gold/55" />
      <CornerRosette className="-top-1.5 -left-1.5" />
      <CornerRosette className="-top-1.5 -right-1.5" />
      <CornerRosette className="-bottom-1.5 -left-1.5" />
      <CornerRosette className="-right-1.5 -bottom-1.5" />
    </div>
  );
}

function VerseText({ verse, recitation }: { verse: Verse; recitation: Recitation }) {
  const recited = recitation.verse === verse.n;
  return (
    <span id={`v${verse.n}`} data-verse={verse.n} className={cn('scroll-mt-20', recited && 'reciting')}>
      {verse.words.map((word, i) => {
        const isLast = i === verse.words.length - 1;
        const span = (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a word's position in the verse is its identity
            key={i}
            data-word={i + 1}
            data-recite={recited ? reciteState(i + 1, recitation.word) : undefined}
            className="cursor-pointer transition-colors [@media(hover:hover)]:hover:text-gold-ink">
            {word.a}
            {isLast ? '' : ' '}
          </span>
        );
        // The verse-end star must never wrap onto a line of its own.
        return isLast ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: a word's position in the verse is its identity
          <span key={i} className="whitespace-nowrap">
            {span} <VerseMarker n={toArabicNumber(verse.n)} />
          </span>
        ) : (
          span
        );
      })}{' '}
    </span>
  );
}

/**
 * One Madinah mushaf page as a sheet of paper in a scrolling stack: framed,
 * with the surah and juz' in the top margin and the page number at the foot.
 * Its text runs at the reader's own Arabic size; the sheet grows to fit.
 */
export const MushafSheet = memo(function MushafSheet({
  page,
  chapter,
  recitation,
}: {
  page: MushafPage;
  chapter: Chapter;
  recitation: Recitation;
}) {
  const t = useT();

  return (
    <section aria-label={t.mushafPage(page.page)} className="mushaf-sheet">
      <Frame />

      <div className="absolute inset-x-8 top-5 flex items-center justify-between text-xs text-gold-ink sm:inset-x-10 sm:top-6">
        <span dir="rtl" lang="ar" className="font-kufi">
          {chapter.nameArabic}
        </span>
        <span dir="rtl" lang="ar" className="font-kufi">
          الجزء {toArabicNumber(page.juz)}
        </span>
      </div>

      <p dir="rtl" lang="ar" className="mushaf-text font-arabic select-none">
        {page.verses.map((verse) => (
          <VerseText key={verse.key} verse={verse} recitation={recitation} />
        ))}
      </p>

      <div className="absolute inset-x-0 bottom-3.5 flex justify-center sm:bottom-4">
        <span className="relative flex size-7 items-center justify-center">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 size-full">
            <path
              d={starOutline({ cx: 12, cy: 12, r: 11.5, inner: 9, n: 8 })}
              className="fill-(--paper) stroke-gold/80"
              strokeWidth={0.9}
            />
          </svg>
          <span className="relative font-arabic text-[11px] leading-none text-gold-ink">
            {toArabicNumber(page.page)}
          </span>
        </span>
      </div>
    </section>
  );
});
