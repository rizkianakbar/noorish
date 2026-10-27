import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { BookHeart, CalendarDays, Moon, Sparkles, Sunrise } from 'lucide-react';
import { useEffect } from 'react';
import { ChoiceGroup } from '#/components/choice-group.tsx';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { PageShell } from '#/components/page-shell.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { duaQueries } from './duas.api.ts';
import { CATEGORY_ARABIC, categoryForHour, DUA_URL_SLUGS, repeatCount } from './duas.lib.ts';
import { useSaidToday } from './duas.store.ts';
import { DuaCard } from './duas-card.tsx';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'morning-dhikr': <Sunrise />,
  'evening-dhikr': <Moon />,
  'dhikr-after-salah': <Sparkles />,
  'daily-dua': <CalendarDays />,
  'selected-dua': <BookHeart />,
};

type DuasPageProps = { category?: string };

/**
 * Duas and adhkar by occasion, with how many have been said today. Each
 * category has its own URL (`/duas/dzikir-pagi`); `/duas` opens on the one
 * for the time of day. A `#dua-id` (from search) scrolls to that dua once it
 * has loaded. The title comes from the root head (`pageHead`), so search
 * engines see the same one.
 */
export function DuasPage(props: DuasPageProps) {
  const { category } = props;
  const t = useT();
  const { language } = usePrefs();
  const navigate = useNavigate();
  const hash = useLocation({ select: (l) => l.hash });
  const index = useQuery(duaQueries.index());
  const said = useSaidToday();
  const categories = index.data?.categories ?? [];
  const current =
    categories.find((c) => c.slug === category) ??
    categories.find((c) => c.slug === categoryForHour(new Date().getHours()));
  const duas = useQuery({ ...duaQueries.category(current?.slug ?? ''), enabled: !!current });
  const doneCount = duas.data?.filter((d) => (said[d.id] ?? 0) >= (repeatCount(d.notes[language]) ?? 1)).length ?? 0;

  // Opened from search: bring that dua into view once its category has loaded.
  useEffect(() => {
    if (hash && duas.data) document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [hash, duas.data]);

  return (
    <PageShell title={t.duas}>
      {current && (
        // Scrolls sideways on phones rather than wrapping onto a second row.
        <div className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0">
          <ChoiceGroup
            label={t.duas}
            value={current.slug}
            onChange={(slug) =>
              void navigate({ to: '/duas/$category', params: { category: DUA_URL_SLUGS[slug] }, replace: true })
            }
            options={categories.map((c) => ({
              value: c.slug,
              label: c.name[language],
              icon: CATEGORY_ICONS[c.slug],
            }))}
            className="w-max flex-nowrap sm:w-auto sm:flex-wrap"
          />
        </div>
      )}

      {current && (
        <section
          // Keys differ from the list's below: siblings sharing a key leave stale copies behind.
          key={`header-${current.slug}`}
          className="dark relative mt-5 animate-in overflow-hidden rounded-[1.75rem] bg-(--ornament-field) px-6 py-6 text-foreground ring-1 ring-gold/30 duration-300 fade-in">
          <Lattice className="opacity-60" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-serif text-2xl">{current.name[language]}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.duaCategoryHints[current.slug]}</p>
            </div>
            <p dir="rtl" lang="ar" className="shrink-0 font-kufi text-2xl text-gold">
              {CATEGORY_ARABIC[current.slug]}
            </p>
          </div>
          {duas.data && (
            <div className="relative mt-5">
              <span className="block h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <span
                  className="block h-full rounded-full bg-gold transition-[width] duration-500"
                  style={{ width: `${(doneCount / duas.data.length) * 100}%` }}
                />
              </span>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                {t.saidToday(doneCount, duas.data.length)}
              </p>
            </div>
          )}
        </section>
      )}

      {(index.isError || duas.isError) && <p className="mt-6 text-sm text-destructive">{t.duasLoadError}</p>}
      <div key={`list-${current?.slug}`} className="mt-5 animate-in space-y-4 duration-300 fade-in">
        {duas.data?.map((dua, i) => (
          <DuaCard key={dua.id} dua={dua} number={i + 1} said={said[dua.id] ?? 0} />
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">{t.duasCredit}</p>
    </PageShell>
  );
}
