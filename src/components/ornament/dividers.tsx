import { useT } from '#/lib/i18n.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import { rosetteFor, starOutline } from './geometry.ts';
import { Lattice } from './lattice.tsx';
import { Rosette } from './rosette.tsx';

/**
 * The separator between verses: a gold hairline that fades out at both
 * ends, knotted at the centre by a small eight-point star. When the next
 * verse opens a new mushaf page, the knot becomes the page number, so a
 * reader can follow along in a printed copy.
 */
export function VerseDivider({ page }: { page?: number }) {
  const t = useT();

  return (
    <div className="flex items-center gap-3 py-1">
      <span aria-hidden="true" className="h-px grow bg-linear-to-r from-transparent via-gold/35 to-gold/50" />
      {page ? (
        <span
          data-i18n
          title={t.mushafPage(page)}
          className="flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] text-gold-ink ring-1 ring-gold/40">
          <span className="sr-only">{t.mushafPage(page)}</span>
          <span aria-hidden="true" className="font-arabic text-xs leading-none">
            {toArabicNumber(page)}
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-gold/35" />
          <span aria-hidden="true" className="tabular-nums">
            {t.pageShort(page)}
          </span>
        </span>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0">
          <path
            d={starOutline({ cx: 12, cy: 12, r: 11, inner: 7.5, n: 8 })}
            className="fill-gold/15 stroke-gold/70"
            strokeWidth={1}
          />
          <circle cx="12" cy="12" r="2" className="fill-gold/80" />
        </svg>
      )}
      <span aria-hidden="true" className="h-px grow bg-linear-to-l from-transparent via-gold/35 to-gold/50" />
    </div>
  );
}

/**
 * The tailpiece that closes a surah, answering the headpiece that opened it.
 */
export function SurahEnd({ surah, name }: { surah: number; name: string }) {
  const t = useT();

  return (
    <div className="mt-12 flex flex-col items-center gap-3">
      <div aria-hidden="true" className="flex w-full items-center gap-4">
        <span className="h-px grow bg-linear-to-r from-transparent to-gold/60" />
        <svg viewBox="0 0 64 64" aria-hidden="true" className="size-14 shrink-0">
          <Rosette cx={32} cy={32} r={30} spec={rosetteFor(surah)} />
        </svg>
        <span className="h-px grow bg-linear-to-l from-transparent to-gold/60" />
      </div>
      <p className="font-serif text-sm text-gold-ink italic">{t.surahEnd(name)}</p>
    </div>
  );
}

/**
 * Marks where a new juz' begins inside a surah: a small illuminated
 * cartouche between gold rules, in the manner of mushaf margin notes.
 */
export function JuzMarker({ juz }: { juz: number }) {
  const t = useT();

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-px grow bg-linear-to-r from-transparent to-gold/60" />
      <span className="dark relative flex h-9 items-center gap-2.5 overflow-hidden rounded-full bg-(--ornament-field) px-4 text-foreground ring-1 ring-gold/50">
        <Lattice size={18} />
        <span data-i18n className="relative font-serif text-sm">
          {t.juz} <span className="text-gold tabular-nums">{juz}</span>
        </span>
        <span aria-hidden="true" className="relative h-4 w-px bg-gold/40" />
        <span dir="rtl" lang="ar" className="relative font-kufi text-base text-gold">
          الجزء {toArabicNumber(juz)}
        </span>
      </span>
      <span className="h-px grow bg-linear-to-l from-transparent to-gold/60" />
    </div>
  );
}
