import { Check, ChevronDown, Link2 } from 'lucide-react';
import { useState } from 'react';
import { starOutline } from '#/components/ornament/geometry.ts';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';
import { gradeStrength, splitNarrator } from './hadith.lib.ts';
import type { Hadith } from './hadith.types.ts';

const COPIED_MS = 1600;

/**
 * Arabic longer than this (chains of narrators run long) is folded to a few
 * lines until opened.
 */
const LONG_ARABIC = 280;

const GRADE_DOT = {
  sahih: 'bg-gold',
  hasan: 'bg-gold/45',
  weak: 'bg-destructive/70',
} as const;

type NumberStarProps = { n: number };

/**
 * The hadith's number in an eight-point star, like the index markers on home.
 */
function NumberStar(props: NumberStarProps) {
  const { n } = props;
  return (
    <span className="relative inline-flex size-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 20, cy: 20, r: 19, inner: 15, n: 8 })}
          className="fill-none stroke-gold"
          strokeWidth={1}
        />
      </svg>
      <span className="relative text-xs font-medium tabular-nums">{n}</span>
    </span>
  );
}

type HadithCardProps = { hadith: Hadith; reference: string };

/**
 * One hadith: its number and reference, the Arabic (folded when long), the
 * translation with its "Narrated …:" line set apart, and the scholars'
 * gradings, each marked authentic, good or weak at a glance.
 */
export function HadithCard(props: HadithCardProps) {
  const { hadith, reference } = props;
  const t = useT();
  const [arabicOpen, setArabicOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const number = Math.floor(hadith.number);
  const long = (hadith.arabic?.length ?? 0) > LONG_ARABIC;
  const translation = hadith.translation ? splitNarrator(hadith.translation) : null;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}#h${hadith.number}`);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <article
      id={`h${hadith.number}`}
      className="scroll-mt-20 rounded-[1.5rem] bg-card px-5 pt-4 pb-5 ring-1 ring-border sm:px-8 sm:pt-6 sm:pb-7">
      <header className="flex items-center gap-3">
        <NumberStar n={number} />
        <p className="min-w-0 grow truncate text-xs font-medium tracking-[0.1em] text-gold-ink uppercase tabular-nums">
          {reference}
        </p>
        <button
          type="button"
          onClick={() => void copyLink()}
          aria-label={copied ? t.copied : t.copyLink}
          title={copied ? t.copied : t.copyLink}
          className="pressable flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground [--press-scale:0.9] hover:bg-muted hover:text-gold-ink [&_svg]:size-4">
          {copied ? <Check className="text-gold-ink" /> : <Link2 />}
        </button>
      </header>

      {hadith.arabic && (
        <div className="mt-5">
          <p
            dir="rtl"
            lang="ar"
            className={cn(
              'font-arabic leading-[2.2]',
              long && !arabicOpen && 'line-clamp-3 mask-b-from-40% mask-b-to-100%',
            )}
            style={{ fontSize: 'calc(var(--arabic-size) * 0.8)' }}>
            {hadith.arabic}
          </p>
          {long && (
            <button
              type="button"
              aria-expanded={arabicOpen}
              onClick={() => setArabicOpen((o) => !o)}
              className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-gold-ink hover:underline">
              {arabicOpen ? t.showLessArabic : t.showArabic}
              <ChevronDown className={cn('size-3.5 transition-transform', arabicOpen && 'rotate-180')} />
            </button>
          )}
        </div>
      )}

      {translation && (
        <div className={cn(hadith.arabic ? 'mt-4 border-t pt-5' : 'mt-5')}>
          {translation.narrator && (
            <p className="mb-2 text-sm font-medium text-muted-foreground">{translation.narrator}</p>
          )}
          <p className="font-serif text-[1.0625rem] leading-[1.8] whitespace-pre-line text-foreground/90">
            {translation.body}
          </p>
        </div>
      )}

      {hadith.grades.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {hadith.grades.map((grade) => {
            const strength = gradeStrength(grade.grade);
            return (
              <li
                key={grade.name}
                className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-full', strength ? GRADE_DOT[strength] : 'bg-muted-foreground/40')}
                />
                <span className="font-medium text-foreground/85">{grade.grade}</span>
                <span>· {grade.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
