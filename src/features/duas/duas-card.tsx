import { Check, ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { starOutline } from '#/components/ornament/geometry.ts';
import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';
import { repeatCount, shortTitle, splitVerseNumbers } from './duas.lib.ts';
import { setSaid } from './duas.store.ts';
import type { Dua } from './duas.types.ts';

type DuaBodyProps = { dua: Dua; focus?: boolean };

/**
 * The dua itself: Arabic, then the transliteration and translation when the
 * reader shows them (the same Latin and Translation prefs as the Quran).
 * Surah passages' "(1)" numbers become verse markers in the Arabic and quiet
 * figures in the rest, instead of bracketed digits that flip about in RTL.
 */
export function DuaBody(props: DuaBodyProps) {
  const { dua, focus } = props;
  const { language, latin, translation } = usePrefs();
  const quietNumbers = (text: string) =>
    splitVerseNumbers(text).map((part, i) =>
      typeof part === 'number' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: parts of a fixed text, never reordered
        <sup key={i} className="mx-0.5 text-[0.65em] text-muted-foreground/70 tabular-nums">
          {part}
        </sup>
      ) : (
        part
      ),
    );

  return (
    // Focused, the Arabic is centred like a page of adhkar; the prose stays start-aligned to be read.
    <div className={cn('space-y-4', focus && 'mx-auto max-w-[38rem]')}>
      <p
        dir="rtl"
        lang="ar"
        className={cn('font-arabic leading-[2.3]', focus && 'text-center')}
        style={{ fontSize: focus ? 'calc(var(--arabic-size) * 1.05)' : 'var(--arabic-size)' }}>
        {splitVerseNumbers(dua.arabic).map((part, i) =>
          typeof part === 'number' ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: parts of a fixed text, never reordered
            <VerseMarker key={i} n={toArabicNumber(part)} />
          ) : (
            part
          ),
        )}
      </p>
      {latin && (
        <p lang="ar-Latn" className="text-[0.9375rem] leading-[1.75] text-muted-foreground">
          {quietNumbers(dua.latin[language])}
        </p>
      )}
      {translation !== 'off' && (
        <p className="font-serif text-[1.0625rem] leading-[1.8] text-foreground/90">
          {quietNumbers(dua.translation[language])}
        </p>
      )}
    </div>
  );
}

type DuaSourceProps = { dua: Dua; center?: boolean };

/**
 * Where it is narrated, and its virtue folded beneath it.
 */
export function DuaSource(props: DuaSourceProps) {
  const { dua, center } = props;
  const t = useT();
  const { language } = usePrefs();
  const [open, setOpen] = useState(false);
  const source = dua.source[language];
  const benefits = dua.benefits[language];
  if (!source && !benefits) return null;

  return (
    <div className={cn('min-w-0', center && 'text-center')}>
      {source && <p className="text-xs text-muted-foreground">{source}</p>}
      {benefits && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1 text-xs font-medium text-gold-ink hover:underline',
              center && 'mx-auto',
            )}>
            {t.duaVirtue}
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <p className="animate-in rounded-xl bg-gold/8 px-4 py-3 text-left text-sm leading-relaxed text-foreground/85 duration-200 fade-in">
              {benefits}
            </p>
          )}
        </>
      )}
    </div>
  );
}

type SayButtonProps = { id: string; said: number; total: number };

/**
 * Saying it in the list: a tap counter for a dua said several times (like a
 * tasbih), or a single check for one said once. Either way it ends in "Done".
 */
function SayButton(props: SayButtonProps) {
  const { id, said, total } = props;
  const t = useT();
  const done = said >= total;

  return (
    <div className="flex items-center gap-1">
      {said > 0 && (
        <button
          type="button"
          aria-label={t.resetCount}
          title={t.resetCount}
          onClick={() => setSaid(id, 0)}
          className="pressable flex size-11 items-center justify-center rounded-full text-muted-foreground [--press-scale:0.9] hover:bg-muted [&_svg]:size-4">
          <RotateCcw />
        </button>
      )}
      <button
        type="button"
        aria-label={total > 1 ? t.countOf(said, total) : t.markSaid}
        aria-pressed={done}
        onClick={() => {
          if (done) return;
          navigator.vibrate?.(said + 1 >= total ? [15, 40, 15] : 8);
          setSaid(id, said + 1);
        }}
        className={cn(
          'pressable relative flex h-11 min-w-28 items-center justify-center gap-1.5 overflow-hidden rounded-full px-4 text-sm font-medium tabular-nums [--press-scale:0.94]',
          done ? 'bg-gold text-lapis' : 'bg-gold/12 text-gold-ink ring-1 ring-gold/40 hover:bg-gold/20',
        )}>
        {/* The count fills the button from the left as it is said. */}
        {!done && total > 1 && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-gold/20 transition-[width] duration-300"
            style={{ width: `${(said / total) * 100}%` }}
          />
        )}
        <span className="relative flex items-center gap-1.5">
          {done ? (
            <>
              <Check className="size-4" />
              {t.duaDone}
            </>
          ) : total > 1 ? (
            `${said} / ${total}`
          ) : (
            t.markSaid
          )}
        </span>
      </button>
    </div>
  );
}

type DuaNumberProps = { n: number; done: boolean };

function DuaNumber(props: DuaNumberProps) {
  const { n, done } = props;
  return (
    <span className="relative inline-flex size-9 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 20, cy: 20, r: 19, inner: 15, n: 8 })}
          className={cn('stroke-gold transition-colors', done ? 'fill-gold' : 'fill-none')}
          strokeWidth={1}
        />
      </svg>
      <span className={cn('relative text-xs font-medium tabular-nums', done && 'text-lapis')}>
        {done ? <Check className="size-3.5" /> : n}
      </span>
    </span>
  );
}

type DuaCardProps = { dua: Dua; number: number; said: number };

/**
 * One dhikr of a daily routine, open, with its counter.
 */
export function DuaCard(props: DuaCardProps) {
  const { dua, number, said } = props;
  const { language } = usePrefs();
  const total = repeatCount(dua.notes[language]) ?? 1;
  const done = said >= total;

  return (
    <article
      id={dua.id}
      className={cn(
        'scroll-mt-20 rounded-[1.5rem] bg-card px-5 pt-5 pb-3 ring-1 transition-[box-shadow] duration-300 sm:px-8 sm:pt-7',
        done ? 'ring-gold/50' : 'ring-border',
      )}>
      <header className="flex items-center gap-3">
        <DuaNumber n={number} done={done} />
        <h2 className="min-w-0 grow font-serif text-lg leading-snug">{dua.title[language]}</h2>
        {total > 1 && (
          <span className="shrink-0 rounded-full bg-gold/12 px-2.5 py-1 text-xs font-medium text-gold-ink tabular-nums">
            {total}×
          </span>
        )}
      </header>
      <div className="mt-5">
        <DuaBody dua={dua} />
      </div>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-2">
        <DuaSource dua={dua} />
        <div className="ml-auto py-2">
          <SayButton id={dua.id} said={said} total={total} />
        </div>
      </footer>
    </article>
  );
}

type DuaRowProps = { dua: Dua; defaultOpen?: boolean };

/**
 * A dua looked up for the moment at hand: its short title, opening in place.
 */
export function DuaRow(props: DuaRowProps) {
  const { dua } = props;
  const { language } = usePrefs();
  const [open, setOpen] = useState(!!props.defaultOpen);

  return (
    <article id={dua.id} className="scroll-mt-20">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/60">
        <span className={cn('grow font-serif text-[1.0625rem] leading-snug', open && 'text-gold-ink')}>
          {shortTitle(dua.title[language])}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="animate-in px-5 pt-1 pb-5 duration-200 fade-in sm:px-8">
          <DuaBody dua={dua} />
          <div className="mt-4 border-t pt-2">
            <DuaSource dua={dua} />
          </div>
        </div>
      )}
    </article>
  );
}
