import { AArrowDown, AArrowUp } from 'lucide-react';
import { useT } from '#/lib/i18n.ts';
import { stepArabicSize } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';

const button =
  'pressable flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted [&_svg]:size-5';

/**
 * Arabic text smaller / larger (the reader's Arabic size pref), in reach
 * while reading duas or hadith.
 */
export function TextSizeButtons(props: { className?: string }) {
  const t = useT();
  return (
    <div className={cn('flex items-center gap-1', props.className)}>
      <button
        type="button"
        aria-label={t.textSmaller}
        title={t.textSmaller}
        onClick={() => stepArabicSize(-1)}
        className={button}>
        <AArrowDown />
      </button>
      <button
        type="button"
        aria-label={t.textLarger}
        title={t.textLarger}
        onClick={() => stepArabicSize(1)}
        className={button}>
        <AArrowUp />
      </button>
    </div>
  );
}
