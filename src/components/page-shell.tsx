import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { useGoBack } from '#/hooks/use-go-back.ts';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';

type PageHeaderProps = {
  title: string;
};

/**
 * Back and the page title. On phones Back stays pinned to the top; once the
 * title scrolls away, the reader's running-head band slides in behind it and
 * carries the title, so the page always says where you are and how to leave.
 */
function PageHeader(props: PageHeaderProps) {
  const { title } = props;
  const t = useT();
  const goBack = useGoBack();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [pastTitle, setPastTitle] = useState(false);

  useEffect(() => {
    const heading = titleRef.current;
    if (!heading) return;
    // The band is 56px tall; the title counts as gone once it slips under it.
    const observer = new IntersectionObserver(([entry]) => setPastTitle(!entry.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 h-14 sm:static sm:mx-0 sm:h-auto">
        {/* The band (phones only) fades in once the title has gone, carrying it. It is `dark`
            like the running head, so its text reads light on lapis in every theme. */}
        <div
          aria-hidden="true"
          className={cn(
            'dark absolute inset-0 overflow-hidden bg-(--ornament-field) text-foreground shadow-[0_10px_30px_-14px_oklch(0.15_0.05_262/0.7)] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:hidden',
            pastTitle ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
          )}>
          <Lattice />
          <span className="absolute inset-x-0 bottom-0.75 h-px bg-gold/30" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-gold/50" />
          <span className="relative flex h-full items-center justify-center px-24 font-serif text-base">
            <span className="truncate">{title}</span>
          </span>
        </div>
        <div className="relative flex h-14 items-center px-4 sm:h-auto sm:px-0">
          <button
            type="button"
            onClick={goBack}
            className={cn(
              'pressable -ml-2 flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground hover:bg-gold/10 hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-gold [&_svg]:size-4',
              pastTitle && 'max-sm:text-gold max-sm:hover:text-gold',
            )}>
            <ArrowLeft />
            {t.back}
          </button>
        </div>
      </div>
      <h1 ref={titleRef} className="mt-2 font-serif text-2xl sm:mt-4">
        {title}
      </h1>
    </>
  );
}

type PageShellProps = {
  title: string;
  /**
   * Set the document title here. Pages search engines index leave it to the
   * root head (`pageHead`), so crawlers and readers see the same title.
   */
  ownTitle?: boolean;
  children: ReactNode;
};

/**
 * The frame of a page off the dock (Settings, Prayer times, Qibla, Memorize,
 * Duas, Hadith): the main landmark, the reading column, and the header.
 */
export function PageShell(props: PageShellProps) {
  const t = useT();
  return (
    <main id="main-content" className="min-w-0 grow">
      {props.ownTitle && <title>{`${props.title} · ${t.appName}`}</title>}
      <div className="mx-auto max-w-2xl px-4 pt-2 pb-40 sm:px-6 sm:pt-10">
        <PageHeader title={props.title} />
        {props.children}
      </div>
    </main>
  );
}
