import { Check, ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { repeatCount } from './duas.lib.ts';
import { setSaid } from './duas.store.ts';
import type { Dua } from './duas.types.ts';

type SayButtonProps = { id: string; said: number; total: number };

/**
 * Saying it: a tap counter for a dua said several times (like a tasbih),
 * or a single check for one said once. Either way it ends in "Done".
 */
function SayButton(props: SayButtonProps) {
  const { id, said, total } = props;
  const t = useT();
  const done = said >= total;

  return (
    <div className="flex items-center gap-1.5">
      {said > 0 && (
        <button
          type="button"
          aria-label={t.resetCount}
          title={t.resetCount}
          onClick={() => setSaid(id, 0)}
          className="pressable flex size-8 items-center justify-center rounded-full text-muted-foreground [--press-scale:0.9] hover:bg-muted [&_svg]:size-3.5">
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
          'pressable flex h-11 min-w-24 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium tabular-nums [--press-scale:0.94]',
          done ? 'bg-gold text-lapis' : 'bg-gold/12 text-gold-ink ring-1 ring-gold/40 hover:bg-gold/20',
        )}>
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
      </button>
    </div>
  );
}

type DuaCardProps = {
  dua: Dua;
  number: number;
  said: number;
  /**
   * Part of a daily routine: always open, with a counter. Otherwise a
   * reference entry, folded to its title until opened.
   */
  routine: boolean;
  defaultOpen?: boolean;
};

/**
 * One dua: open with its counter in a routine, or a title that opens to the
 * dua when looked up.
 */
export function DuaCard(props: DuaCardProps) {
  const { dua, number, said, routine } = props;
  const t = useT();
  const { language, latin } = usePrefs();
  const [virtueOpen, setVirtueOpen] = useState(false);
  const [open, setOpen] = useState(routine || !!props.defaultOpen);
  const total = repeatCount(dua.notes[language]) ?? 1;
  const done = routine && said >= total;
  const benefits = dua.benefits[language];
  const source = dua.source[language];

  return (
    <article
      id={dua.id}
      className={cn(
        'scroll-mt-20 rounded-2xl border bg-card px-5 transition-colors duration-300',
        open ? 'pt-4 pb-5' : 'py-3.5',
        done && 'border-gold/45',
      )}>
      {!routine && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="-mx-5 -my-3.5 flex w-[calc(100%+2.5rem)] items-center gap-3 px-5 py-3.5 text-left">
          <span className="grow font-serif text-lg leading-snug">{dua.title[language]}</span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
      )}
      {routine && (
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums transition-colors',
              done ? 'bg-gold text-lapis' : 'bg-muted text-muted-foreground',
            )}>
            {done ? <Check className="size-3.5" /> : number}
          </span>
          <h2 className="grow font-serif text-lg leading-snug">{dua.title[language]}</h2>
          {total > 1 && (
            <span className="shrink-0 rounded-full bg-gold/12 px-2.5 py-1 text-xs font-medium text-gold-ink tabular-nums">
              {total}×
            </span>
          )}
        </div>
      )}

      {open && (
        <>
          <p
            dir="rtl"
            lang="ar"
            className="mt-4 font-arabic leading-[2.2]"
            style={{ fontSize: 'calc(var(--arabic-size) * 0.85)' }}>
            {dua.arabic}
          </p>
          {latin && (
            <p lang="ar-Latn" className="mt-3 font-serif text-[1.0625rem] leading-[1.7] text-gold-ink italic">
              {dua.latin[language]}
            </p>
          )}
          <p className="mt-3 font-serif text-[1.0625rem] leading-[1.75] text-foreground/80">
            {dua.translation[language]}
          </p>

          {virtueOpen && benefits && (
            <p className="mt-4 animate-in rounded-r-lg border-l-2 border-gold bg-gold/8 px-4 py-2.5 text-sm leading-relaxed text-foreground/80 duration-200 fade-in">
              {benefits}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3 border-t pt-4">
            <div className="min-w-0 grow">
              {source && <p className="text-xs text-muted-foreground">{source}</p>}
              {benefits && (
                <button
                  type="button"
                  aria-expanded={virtueOpen}
                  onClick={() => setVirtueOpen((open) => !open)}
                  className="mt-0.5 flex items-center gap-1 text-xs font-medium text-gold-ink hover:underline">
                  {t.duaVirtue}
                  <ChevronDown className={cn('size-3.5 transition-transform', virtueOpen && 'rotate-180')} />
                </button>
              )}
            </div>
            {routine && <SayButton id={dua.id} said={said} total={total} />}
          </div>
        </>
      )}
    </article>
  );
}
