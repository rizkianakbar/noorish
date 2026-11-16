import { Brain, Check, Link2, NotebookPen } from 'lucide-react';
import { RouterAnchor } from '#/components/router-anchor.tsx';
import { Drawer, DrawerContent, DrawerTitle } from '#/components/ui/drawer.tsx';
import { useT } from '#/lib/i18n.ts';

/**
 * Phones: the verse's secondary actions in a bottom sheet behind ⋯.
 */
export function VerseMoreSheet({
  open,
  onOpenChange,
  verseKey,
  memorizeHref,
  signedIn,
  copied,
  onCopyLink,
  onNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verseKey: string;
  memorizeHref: string;
  signedIn: boolean;
  copied: boolean;
  onCopyLink: () => Promise<void>;
  onNote: () => void;
}) {
  const t = useT();
  const row =
    'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-muted [&_svg]:size-4.5 [&_svg]:text-gold-ink';
  const then = (action: () => unknown) => () => {
    void action();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-[1.75rem] border-gold/35 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <DrawerTitle className="px-5 pt-1 pb-2 font-serif text-base font-normal">
          {t.moreActions} <span className="text-gold-ink tabular-nums">{verseKey}</span>
        </DrawerTitle>
        <div className="flex flex-col gap-0.5 px-2">
          <button type="button" className={row} onClick={then(onCopyLink)}>
            {copied ? <Check /> : <Link2 />}
            {copied ? t.copied : t.copyLink}
          </button>
          <RouterAnchor href={memorizeHref} className={row} onClick={() => onOpenChange(false)}>
            <Brain />
            {t.memorizeFromHere}
          </RouterAnchor>
          {signedIn ? (
            <button type="button" className={row} onClick={then(onNote)}>
              <NotebookPen />
              {t.note}
            </button>
          ) : (
            <RouterAnchor href="/login" className={row} onClick={() => onOpenChange(false)}>
              <NotebookPen />
              {t.signInToNote}
            </RouterAnchor>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
