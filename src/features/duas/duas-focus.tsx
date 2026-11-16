import { Link, useNavigate } from '@tanstack/react-router';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { buttonVariants } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { DUA_URL_SLUGS, isSaid, repeatCount } from './duas.lib.ts';
import { setSaid } from './duas.store.ts';
import type { Dua } from './duas.types.ts';
import { DuaBody, DuaSource } from './duas-card.tsx';

const RING = 2 * Math.PI * 44;

type DuasFocusProps = {
  slug: string;
  duas: Dua[];
  /**
   * 1-based; one past the end is the "done" screen.
   */
  index: number;
  said: Record<string, number>;
};

/**
 * A routine one dhikr at a time, like a tasbih: the dhikr fills the screen,
 * a big counter sits in the thumb's reach above the dock, and finishing a
 * count moves on to the next one not yet said. Its place is in the URL
 * (`?recite=3`, replaced as it moves), so Back leaves in one step.
 */
export function DuasFocus(props: DuasFocusProps) {
  const { slug, duas, index, said } = props;
  const t = useT();
  const { language } = usePrefs();
  const navigate = useNavigate();
  const advance = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(advance.current), []);

  const go = (n: number) => {
    clearTimeout(advance.current);
    void navigate({
      to: '/duas/$category',
      params: { category: DUA_URL_SLUGS[slug] },
      search: { recite: n },
      replace: true,
    });
  };
  const listLink = { to: '/duas/$category', params: { category: DUA_URL_SLUGS[slug] } } as const;

  const segments = (
    <ol aria-hidden="true" className="flex grow gap-1">
      {duas.map((d, i) => (
        <li
          key={d.id}
          className={cn(
            'h-1 flex-1 rounded-full bg-border transition-colors duration-300',
            isSaid(d, said, language) ? 'bg-gold' : i + 1 === index && 'bg-gold/45',
          )}
        />
      ))}
    </ol>
  );

  const dua = duas[index - 1];
  if (!dua) {
    return (
      <>
        <div className="mt-4 flex items-center">{segments}</div>
        <section className="dark relative mt-8 animate-in overflow-hidden rounded-[1.75rem] bg-(--ornament-field) px-6 py-12 text-center text-foreground ring-1 ring-gold/30 duration-300 fade-in zoom-in-95">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-7">
            <Check />
          </span>
          <h2 className="mt-5 font-serif text-2xl">{t.planTodayDone}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t.duaAllSaid}</p>
          <Link
            {...listLink}
            className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'mt-6 h-11 rounded-full')}>
            {t.close}
          </Link>
        </section>
      </>
    );
  }

  const total = repeatCount(dua.notes[language]) ?? 1;
  const count = Math.min(said[dua.id] ?? 0, total);
  const done = count >= total;
  // After this one: the next not yet said, wrapping round, else the done screen.
  const nextUnsaid = () => {
    const order = [...duas.slice(index), ...duas.slice(0, index - 1)];
    const next = order.find((d) => !isSaid(d, said, language));
    return next ? duas.indexOf(next) + 1 : duas.length + 1;
  };

  const tap = () => {
    if (done) return go(nextUnsaid());
    const finished = count + 1 >= total;
    navigator.vibrate?.(finished ? [15, 40, 15] : 8);
    setSaid(dua.id, count + 1);
    // A beat on the full count, so it registers, then on to the next.
    if (finished) {
      const next = nextUnsaid();
      advance.current = setTimeout(() => go(next), 550);
    }
  };

  return (
    <>
      <div className="mt-4 flex items-center gap-3">
        {segments}
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{t.duaPosition(index, duas.length)}</span>
      </div>

      <article key={dua.id} className="mt-8 animate-in duration-300 fade-in slide-in-from-bottom-2">
        <h2 className="text-center font-serif text-2xl leading-snug text-balance">{dua.title[language]}</h2>
        {dua.notes[language] && <p className="mt-2 text-center text-sm text-gold-ink">{dua.notes[language]}</p>}
        <div className="mt-8">
          <DuaBody dua={dua} focus />
        </div>
        <div className="mt-6">
          <DuaSource dua={dua} center />
        </div>
      </article>

      {/* The counter: sticks above the dock so a long dhikr never hides it. */}
      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 mt-10 flex justify-center">
        <div className="flex items-center gap-4 rounded-full bg-card/90 p-2 shadow-lg ring-1 ring-border backdrop-blur">
          <button
            type="button"
            aria-label={t.previous}
            disabled={index <= 1}
            onClick={() => go(index - 1)}
            className="pressable flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30 [&_svg]:size-5">
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={tap}
            aria-label={done ? t.next : total > 1 ? `${t.duaTapToCount}: ${t.countOf(count, total)}` : t.markSaid}
            className="pressable relative flex size-20 items-center justify-center rounded-full [--press-scale:0.92]">
            <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
              <circle cx="50" cy="50" r="44" className="fill-gold/12 stroke-border" strokeWidth="5" />
              <circle
                cx="50"
                cy="50"
                r="44"
                className="fill-none stroke-gold transition-[stroke-dashoffset] duration-300"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - count / total)}
              />
            </svg>
            <span
              aria-live="polite"
              className={cn(
                'relative flex size-15 items-center justify-center rounded-full font-serif text-xl tabular-nums transition-colors',
                done ? 'bg-gold text-lapis' : 'text-gold-ink',
              )}>
              {done ? (
                <Check className="size-6" />
              ) : total > 1 ? (
                <span>
                  {count}
                  <span className="text-sm text-muted-foreground">/{total}</span>
                </span>
              ) : (
                <Check className="size-6 opacity-60" />
              )}
            </span>
          </button>
          <button
            type="button"
            aria-label={t.next}
            onClick={() => go(index + 1)}
            className="pressable flex size-12 items-center justify-center rounded-full text-muted-foreground hover:bg-muted [&_svg]:size-5">
            <ChevronRight />
          </button>
        </div>
      </div>
    </>
  );
}
