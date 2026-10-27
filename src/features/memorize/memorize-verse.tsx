import { VerseMarker } from '#/components/ornament/headpiece.tsx';
import { reciteState } from '#/features/reader/reader-recite.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { toArabicNumber } from '#/lib/quran/data.ts';
import type { Verse } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';

export interface MemorizeVerseProps {
  verse: Verse;
  /**
   * Hide the words (Recite, Connect, Review); the reader taps a word to check it.
   */
  hidden: boolean;
  firstWordHint: boolean;
  /**
   * Words peeked at, by 1-based position.
   */
  revealed: ReadonlySet<number>;
  onReveal: (word: number) => void;
  /**
   * The word being recited when this verse is playing (null between words).
   */
  recitedWord: number | null | undefined;
  translation: string | null;
  size?: 'large' | 'normal';
}

/**
 * A verse's Arabic for memorizing. Hidden words are slim bars that keep the
 * verse's shape; each is its own button, so a tap checks just that word.
 * Peeked words keep a faint gold underline, marking where help was needed.
 */
export function MemorizeVerse(props: MemorizeVerseProps) {
  const { verse, hidden, firstWordHint, revealed, onReveal, recitedWord, translation, size = 'normal' } = props;
  const t = useT();
  const reciting = recitedWord !== undefined;

  return (
    <div>
      <p
        dir="rtl"
        lang="ar"
        className={cn('font-arabic leading-[2.3] select-none', reciting && 'reciting')}
        style={{ fontSize: size === 'large' ? 'calc(var(--arabic-size) * 1.15)' : 'var(--arabic-size)' }}>
        {verse.words.map((word, i) => {
          const position = i + 1;
          const peeked = hidden && revealed.has(position);
          const shown = !hidden || peeked || (firstWordHint && position === 1);
          const state = reciting ? reciteState(position, recitedWord) : undefined;
          const space = position < verse.words.length ? ' ' : '';
          if (shown) {
            return (
              <span key={position}>
                <span
                  data-recite={state}
                  className={cn(peeked && 'underline decoration-gold/60 decoration-2 underline-offset-[0.5em]')}>
                  {word.a}
                </span>
                {space}
              </span>
            );
          }
          return (
            <span key={position}>
              {/* Hidden words skip the karaoke styles: their gold ink would read the word out. */}
              <button
                type="button"
                aria-label={t.revealWord(position)}
                onClick={() => onReveal(position)}
                data-current={state === 'current' ? '' : undefined}
                className="word-hidden cursor-pointer">
                {word.a}
              </button>
              {space}
            </span>
          );
        })}{' '}
        <VerseMarker n={toArabicNumber(verse.n)} />
      </p>
      {translation && (
        <p className="mt-2 max-w-[65ch] font-serif text-[1.0625rem] leading-[1.7] text-foreground/75">{translation}</p>
      )}
    </div>
  );
}
