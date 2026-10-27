import { Check, Headphones, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';
import { type BuildWord, bareArabic, checkGaps, hiddenWords, wordBank } from './memorize.lib.ts';

export interface MemorizeBuildProps {
  words: BuildWord[];
  part: 'arabic' | 'meaning';
  /**
   * Words of the whole surah (Arabic or translation), where the extra tiles come from.
   */
  pool: BuildWord[];
  /**
   * Picks the gaps and the bank; a new seed is a new puzzle.
   */
  seed: string;
  onContinue: () => void;
  onListenAgain: () => void;
}

type Status = 'building' | 'correct' | 'wrong';

/**
 * An empty gap about as wide as its word, measured on the bare letters:
 * Arabic vowel marks are characters too, and counting them made gaps twice
 * too wide.
 */
function gapWidth(word: BuildWord, arabic: boolean): string {
  const em = arabic
    ? Math.min(4, Math.max(2, word.bare.length * 0.5))
    : Math.min(7, Math.max(3, word.bare.length * 0.55));
  return `${em}em`;
}

/**
 * Build the verse (or its meaning) from a word bank, like Duolingo: some
 * words are gaps, anywhere in the verse; tap tiles to fill them in order,
 * tap a placed word to send it back, then Check. A used tile leaves its
 * outline in the bank, so nothing jumps while the reader works.
 */
export function MemorizeBuild(props: MemorizeBuildProps) {
  const { words, part, pool, seed, onContinue, onListenAgain } = props;
  const t = useT();
  const hidden = useMemo(() => hiddenWords(seed, words.length), [seed, words.length]);
  const answer = useMemo(() => hidden.map((i) => words[i]), [hidden, words]);
  const tiles = useMemo(() => wordBank(answer, pool, seed), [answer, pool, seed]);
  const [placed, setPlaced] = useState<(number | null)[]>(() => hidden.map(() => null));
  const [status, setStatus] = useState<Status>('building');
  const [results, setResults] = useState<boolean[]>([]);
  const arabic = part === 'arabic';
  const bare = arabic ? bareArabic : (text: string) => text.toLowerCase();
  const textOf = (id: number | null) => (id === null ? null : (tiles.find((tile) => tile.id === id)?.text ?? null));
  const full = placed.every((id) => id !== null);

  const place = (id: number) => {
    if (status !== 'building') return;
    const gap = placed.indexOf(null);
    if (gap === -1) return;
    setPlaced((prev) => prev.map((p, i) => (i === gap ? id : p)));
  };
  const unplace = (gap: number) => {
    if (status !== 'building') return;
    setPlaced((prev) => prev.map((p, i) => (i === gap ? null : p)));
  };
  const check = () => {
    const outcome = checkGaps(answer, placed.map(textOf), bare);
    setResults(outcome);
    const right = outcome.every(Boolean);
    setStatus(right ? 'correct' : 'wrong');
    navigator.vibrate?.(right ? 15 : [30, 40, 30]);
  };
  const retry = () => {
    setPlaced(hidden.map(() => null));
    setResults([]);
    setStatus('building');
  };

  const sentenceClass = arabic ? 'font-arabic leading-[2.5]' : 'font-serif text-lg leading-[2.4]';
  const tileText = arabic ? 'font-arabic text-[1.375rem] leading-none' : 'text-base';

  return (
    <div className="space-y-7">
      <p
        dir={arabic ? 'rtl' : 'ltr'}
        lang={arabic ? 'ar' : undefined}
        className={cn(sentenceClass, 'select-none')}
        style={arabic ? { fontSize: 'calc(var(--arabic-size) * 1.05)' } : undefined}>
        {words.map((word) => {
          const gap = hidden.indexOf(word.position);
          const space = word.position < words.length - 1 ? ' ' : '';
          if (gap === -1) {
            return (
              <span key={word.position}>
                {word.shown}
                {space}
              </span>
            );
          }
          const text = textOf(placed[gap]);
          const wrong = status === 'wrong' && results[gap] === false;
          return (
            <span key={word.position}>
              {text ? (
                <button
                  type="button"
                  aria-label={t.removeWord(text)}
                  onClick={() => unplace(gap)}
                  disabled={status !== 'building'}
                  className={cn(
                    'pressable inline-flex animate-in items-center rounded-xl border-2 px-2.5 py-1 align-middle duration-200 zoom-in-90',
                    tileText,
                    status === 'correct' && 'border-gold bg-gold/15 text-gold-ink',
                    status === 'building' && 'border-gold/50 bg-card',
                    status === 'wrong' &&
                      (wrong ? 'quiz-shake border-destructive/60 bg-destructive/8 text-destructive' : 'border-gold/50'),
                  )}>
                  {text}
                </button>
              ) : (
                <span
                  className={cn(
                    'inline-block rounded-xl border-2 border-dashed align-middle',
                    placed.indexOf(null) === gap ? 'border-gold/70 bg-gold/8' : 'border-border',
                    arabic ? 'h-[1.25em]' : 'h-[1.8em]',
                  )}
                  style={{ width: gapWidth(word, arabic) }}
                />
              )}
              {space}
            </span>
          );
        })}
      </p>

      {status === 'building' && (
        <fieldset className="flex flex-wrap justify-center gap-2.5" dir={arabic ? 'rtl' : 'ltr'}>
          <legend className="sr-only">{t.wordBank}</legend>
          {tiles.map((tile) => {
            const used = placed.includes(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                disabled={used}
                aria-hidden={used || undefined}
                onClick={() => place(tile.id)}
                className={cn(
                  'pressable rounded-xl border-2 border-b-4 bg-card px-3.5 py-2 hover:border-gold/50',
                  tileText,
                  used && 'border-transparent bg-muted text-transparent',
                )}>
                {tile.text}
              </button>
            );
          })}
        </fieldset>
      )}

      {status === 'building' && (
        <Button
          size="lg"
          variant="gold"
          className="h-12 w-full rounded-full text-base"
          disabled={!full}
          onClick={check}>
          {t.check}
        </Button>
      )}

      {status === 'correct' && (
        <div className="animate-in space-y-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 duration-300 fade-in slide-in-from-bottom-2">
          <p className="flex items-center gap-2 font-medium text-gold-ink">
            <span className="flex size-7 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-4">
              <Check />
            </span>
            {t.correct}
          </p>
          <Button size="lg" variant="gold" className="h-12 w-full rounded-full text-base" onClick={onContinue}>
            {t.continue}
          </Button>
        </div>
      )}

      {status === 'wrong' && (
        <div className="animate-in space-y-4 rounded-2xl border border-destructive/30 bg-destructive/6 p-4 duration-300 fade-in slide-in-from-bottom-2">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <span className="flex size-7 items-center justify-center rounded-full bg-destructive/15 [&_svg]:size-4">
              <X />
            </span>
            {t.notQuite}
          </p>
          <div>
            <p className="text-xs text-muted-foreground">{t.correctAnswer}</p>
            <p
              dir={arabic ? 'rtl' : 'ltr'}
              lang={arabic ? 'ar' : undefined}
              className={cn(
                'mt-1',
                arabic ? 'font-arabic text-2xl leading-[2.1]' : 'font-serif text-base leading-relaxed',
              )}>
              {words.map((word) => {
                const gap = hidden.indexOf(word.position);
                return (
                  <span key={word.position}>
                    <span
                      className={cn(
                        gap !== -1 && 'text-gold-ink',
                        results[gap] === false &&
                          'underline decoration-destructive/60 decoration-2 underline-offset-[0.4em]',
                      )}>
                      {word.shown}
                    </span>
                    {word.position < words.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="lg" className="h-12 flex-1 rounded-full" onClick={onListenAgain}>
              <Headphones data-icon="inline-start" />
              {t.listenAgain}
            </Button>
            <Button size="lg" variant="gold" className="h-12 flex-1 rounded-full text-base" onClick={retry}>
              <RotateCcw data-icon="inline-start" />
              {t.tryAgain}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
