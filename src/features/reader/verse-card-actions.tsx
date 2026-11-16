import {
  Bookmark,
  BookOpenText,
  Brain,
  Check,
  ChevronDown,
  Ellipsis,
  Link2,
  ListVideo,
  Loader2,
  NotebookPen,
  Pause,
  Play,
} from 'lucide-react';
import { useState } from 'react';
import { RouterAnchor } from '#/components/router-anchor.tsx';
import { buttonVariants } from '#/components/ui/button.tsx';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '#/components/ui/menu.tsx';
import { play, togglePause } from '#/features/audio/audio.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';

// Every verse carries these, so they stay plain elements rather than design
// system components: a long surah renders hundreds of them at once.
function actionClass(active: boolean | undefined, className?: string) {
  return cn(
    buttonVariants({ variant: 'ghost', size: 'xs' }),
    'text-muted-foreground',
    active && 'bg-highlight text-highlight-foreground hover:bg-highlight',
    className,
  );
}

function ActionButton({ active, className, ...props }: React.ComponentProps<'button'> & { active?: boolean }) {
  return <button type="button" className={actionClass(active, className)} {...props} />;
}

/**
 * Memorize from this verse: up to five verses (the page clamps to the surah's end).
 */
export const memorizeHref = (surah: number, verse: number) => `/memorize?surah=${surah}&from=${verse}&to=${verse + 4}`;

function SignInLink({ className, ...props }: Omit<React.ComponentProps<'a'>, 'href'>) {
  return <RouterAnchor href="/login" className={actionClass(false, className)} {...props} />;
}

/**
 * Play ▾: this verse alone, or on from it. The menu is only created on first
 * use, not up front for every verse.
 */
function PlayMenu({ surah, verse }: { surah: number; verse: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const label = (
    <>
      <Play />
      {t.play}
      <ChevronDown className="-mr-0.5 opacity-70" />
    </>
  );

  if (!mounted) {
    return (
      <ActionButton
        aria-haspopup="menu"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}>
        {label}
      </ActionButton>
    );
  }
  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger render={<ActionButton />}>{label}</MenuTrigger>
      <MenuContent>
        <MenuItem onClick={() => play(surah, verse)}>
          <Play />
          {t.playThisAyah}
        </MenuItem>
        <MenuItem onClick={() => play(surah, verse, { continuous: true })}>
          <ListVideo />
          {t.playFromHere}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export interface VerseActionsProps {
  surah: number;
  verse: number;
  verseKey: string;
  recitation: { playing: boolean; loading: boolean } | null;
  signedIn: boolean;
  bookmarked: boolean;
  tafsirOpen: boolean;
  editing: boolean;
  copied: boolean;
  onToggleTafsir: () => void;
  onToggleNote: () => void;
  onCopyLink: () => void;
  onOpenMore: () => void;
  onToggleBookmark: () => void;
}

/**
 * The row under a verse. Secondary actions sit inline from md up and behind
 * ⋯ on phones.
 */
export function VerseActions(props: VerseActionsProps) {
  const t = useT();
  const { recitation, signedIn, bookmarked, editing, copied } = props;
  // Whichever mode is reciting this verse, its button pauses it.
  const sounding = !!recitation && (recitation.playing || recitation.loading);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-0.5">
      <span className="mr-2 text-xs text-gold-ink tabular-nums">{props.verseKey}</span>
      {sounding ? (
        <ActionButton active onClick={togglePause}>
          {recitation.loading ? <Loader2 className="animate-spin" /> : <Pause />}
          {t.pause}
        </ActionButton>
      ) : (
        <PlayMenu surah={props.surah} verse={props.verse} />
      )}
      <ActionButton active={props.tafsirOpen} aria-expanded={props.tafsirOpen} onClick={props.onToggleTafsir}>
        <BookOpenText />
        {t.tafsir}
      </ActionButton>

      <ActionButton className="hidden md:inline-flex" onClick={props.onCopyLink}>
        {copied ? <Check /> : <Link2 />}
        {copied ? t.copied : t.copyLink}
      </ActionButton>
      {signedIn ? (
        <ActionButton className="hidden md:inline-flex" active={editing} onClick={props.onToggleNote}>
          <NotebookPen />
          {t.note}
        </ActionButton>
      ) : (
        <SignInLink className="hidden md:inline-flex">
          <NotebookPen />
          {t.note}
        </SignInLink>
      )}
      <RouterAnchor
        href={memorizeHref(props.surah, props.verse)}
        className={actionClass(false, 'hidden md:inline-flex')}>
        <Brain />
        {t.memorizeFromHere}
      </RouterAnchor>
      <ActionButton
        className="md:hidden"
        title={t.moreActions}
        aria-label={t.moreActions}
        aria-haspopup="dialog"
        onClick={props.onOpenMore}>
        <Ellipsis />
      </ActionButton>

      <span className="ml-auto">
        {signedIn ? (
          <ActionButton
            active={bookmarked}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? t.bookmarked : t.bookmark}
            title={bookmarked ? t.bookmarked : t.bookmark}
            onClick={props.onToggleBookmark}>
            <Bookmark className={cn(bookmarked && 'fill-current')} />
            <span className="hidden md:inline">{bookmarked ? t.bookmarked : t.bookmark}</span>
          </ActionButton>
        ) : (
          <SignInLink aria-label={t.bookmark} title={t.bookmark}>
            <Bookmark />
            <span className="hidden md:inline">{t.bookmark}</span>
          </SignInLink>
        )}
      </span>
    </div>
  );
}
