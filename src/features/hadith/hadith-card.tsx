import { Check, Link2 } from 'lucide-react';
import { useState } from 'react';
import { starOutline } from '#/components/ornament/geometry.ts';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';
import type { Hadith } from './hadith.types.ts';

const COPIED_MS = 1600;

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
 * One hadith: its number and reference, the Arabic (often long with its
 * chain of narrators, so folded to a few lines until opened), the
 * translation, and the scholars' gradings where the source has them.
 */
export function HadithCard(props: HadithCardProps) {
  const { hadith, reference } = props;
  const t = useT();
  const [arabicOpen, setArabicOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const number = Math.floor(hadith.number);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}#h${hadith.number}`);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <article id={`h${hadith.number}`} className="scroll-mt-20 rounded-2xl border bg-card px-5 pt-4 pb-5">
      <div className="flex items-center gap-3">
        <NumberStar n={number} />
        <p className="min-w-0 grow truncate text-xs font-medium tracking-[0.1em] text-gold-ink uppercase tabular-nums">
          {reference}
        </p>
        <button
          type="button"
          onClick={() => void copyLink()}
          aria-label={copied ? t.copied : t.copyLink}
          title={copied ? t.copied : t.copyLink}
          className="pressable flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground [--press-scale:0.9] hover:bg-muted hover:text-gold-ink [&_svg]:size-4">
          {copied ? <Check className="text-gold-ink" /> : <Link2 />}
        </button>
      </div>

      {hadith.arabic && (
        <div className="mt-4">
          <p
            dir="rtl"
            lang="ar"
            className={cn('font-arabic leading-[2.1]', !arabicOpen && 'line-clamp-4')}
            style={{ fontSize: 'calc(var(--arabic-size) * 0.75)' }}>
            {hadith.arabic}
          </p>
          {!arabicOpen && hadith.arabic.length > 280 && (
            <button
              type="button"
              onClick={() => setArabicOpen(true)}
              className="mt-1 text-xs font-medium text-gold-ink hover:underline">
              {t.showArabic}
            </button>
          )}
        </div>
      )}

      {hadith.translation && (
        <p
          className={cn(
            'font-serif text-[1.0625rem] leading-[1.75] whitespace-pre-line text-foreground/85',
            hadith.arabic ? 'mt-4 border-t pt-4' : 'mt-4',
          )}>
          {hadith.translation}
        </p>
      )}

      {hadith.grades.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {hadith.grades.map((grade) => (
            <li key={grade.name} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{grade.grade}</span> · {grade.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
