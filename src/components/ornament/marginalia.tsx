import { useT } from '#/lib/i18n.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import { starOutline } from './geometry.ts';

/**
 * The teardrop that classical mushafs set in the margin every fifth verse
 * (khams).
 */
function KhamsMark({ n }: { n: number }) {
  return (
    <span className="relative flex h-10 w-8 items-center justify-center">
      <svg viewBox="0 0 32 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d="M16 1 C25 12 29 21 29 27 A13 13 0 0 1 3 27 C3 21 7 12 16 1 Z"
          className="fill-gold/12 stroke-gold/80"
          strokeWidth={1.2}
        />
        <path
          d="M16 7 C22 15 25 21 25 26 A9 9 0 0 1 7 26 C7 21 10 15 16 7 Z"
          className="fill-none stroke-gold/40"
          strokeWidth={0.8}
        />
      </svg>
      <span className="relative mt-3 font-kufi text-xs leading-none font-medium text-gold-ink">
        {toArabicNumber(n)}
      </span>
    </span>
  );
}

/**
 * The rosette set in the margin every tenth verse ('ashr).
 */
function AshrMark({ n }: { n: number }) {
  return (
    <span className="relative flex size-11 items-center justify-center">
      <svg viewBox="0 0 44 44" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 22, cy: 22, r: 21, inner: 17, n: 16 })}
          className="fill-gold/12 stroke-gold/80"
          strokeWidth={1.1}
        />
        <circle cx="22" cy="22" r="13" className="fill-none stroke-gold/45" strokeWidth={0.8} />
      </svg>
      <span className="relative font-kufi text-sm leading-none font-medium text-gold-ink">{toArabicNumber(n)}</span>
    </span>
  );
}

/**
 * The marginal cartouche beside a verse of prostration.
 */
function SajdahMark() {
  return (
    <span className="dark relative flex h-8 items-center overflow-hidden rounded-full bg-(--ornament-field) px-3 ring-1 ring-gold/60">
      <span dir="rtl" lang="ar" className="font-kufi text-sm leading-none text-gold">
        سجدة
      </span>
    </span>
  );
}

/**
 * What a mushaf's outer margin would carry beside this verse: a sajdah
 * cartouche, an 'ashr rosette (every tenth verse) or a khams teardrop
 * (every fifth). Lives in the empty left margin on wide screens only; it is
 * ornament, and the sajdah also gets an inline note (see `SajdahNote`).
 */
export function MarginMarker({ verse, sajdah }: { verse: number; sajdah: boolean }) {
  const mark = sajdah ? (
    <SajdahMark />
  ) : verse % 10 === 0 ? (
    <AshrMark n={verse} />
  ) : verse % 5 === 0 ? (
    <KhamsMark n={verse} />
  ) : null;
  if (!mark) return null;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-9 -left-24 hidden w-20 justify-center xl:flex">
      {mark}
    </span>
  );
}

/**
 * The inline, every-screen notice under a verse of prostration.
 */
export function SajdahNote() {
  const t = useT();

  return (
    <p className="mt-4 flex items-center gap-2 text-xs text-gold-ink">
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0">
        <path
          d={starOutline({ cx: 8, cy: 8, r: 7.5, inner: 5, n: 8 })}
          className="fill-gold/25 stroke-gold"
          strokeWidth={0.8}
        />
      </svg>
      {t.sajdahNote}
    </p>
  );
}
