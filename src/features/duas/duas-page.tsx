import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { Play, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { PageShell } from '#/components/page-shell.tsx';
import { TextSizeButtons } from '#/components/text-size-buttons.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Toggle } from '#/components/ui/toggle.tsx';
import { parseQuery } from '#/features/search/search.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { setPref, usePrefs } from '#/lib/prefs.ts';
import { duaQueries } from './duas.api.ts';
import { CATEGORY_ARABIC, DUA_URL_SLUGS, groupDailyDuas, isSaid, ROUTINE_CATEGORIES, searchDuas } from './duas.lib.ts';
import { useSaidToday } from './duas.store.ts';
import type { Dua } from './duas.types.ts';
import { DuaCard, DuaRow } from './duas-card.tsx';
import { DuasFocus } from './duas-focus.tsx';

/**
 * How the duas read: transliteration and translation on or off (the same
 * prefs as the Quran reader) and the Arabic size, in reach while reading.
 */
function ReadingControls() {
  const t = useT();
  const { latin, translation } = usePrefs();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle variant="outline" size="lg" pressed={latin} onPressedChange={(on) => setPref('latin', on)}>
        {t.latin}
      </Toggle>
      <Toggle
        variant="outline"
        size="lg"
        pressed={translation !== 'off'}
        onPressedChange={(on) => setPref('translation', on ? 'auto' : 'off')}>
        {t.translation}
      </Toggle>
      <TextSizeButtons className="ml-auto" />
    </div>
  );
}

type ReferenceListProps = { slug: string; duas: Dua[]; openId: string };

/**
 * Duas looked up for the moment at hand: a filter, then short titles in
 * groups (the daily duas by occasion), each opening in place.
 */
function ReferenceList(props: ReferenceListProps) {
  const { slug, duas, openId } = props;
  const t = useT();
  const [filter, setFilter] = useState('');
  const query = parseQuery(filter);
  const filtering = query.terms.length > 0 || !!query.arabic;
  const groups = filtering
    ? [
        {
          key: 'results',
          duas: searchDuas(
            duas.map((dua) => ({ dua, category: slug })),
            query,
            duas.length,
          ).map((hit) => hit.dua),
        },
      ]
    : slug === 'daily-dua'
      ? groupDailyDuas(duas)
      : [{ key: 'all', duas }];

  return (
    <>
      <div className="relative mt-6">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={t.filterDuas}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.filterDuas}
          className="h-11 rounded-full pl-10 text-base sm:text-sm"
        />
      </div>
      {filtering && groups[0].duas.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t.noDuaMatch}</p>
      )}
      <div className="mt-6 space-y-7">
        {groups.map(
          (group) =>
            group.duas.length > 0 && (
              <section key={group.key} aria-label={t.duaGroups[group.key]}>
                {t.duaGroups[group.key] && (
                  <h2 className="mb-2 px-1 text-xs font-medium tracking-[0.16em] text-gold-ink uppercase">
                    {t.duaGroups[group.key]}
                  </h2>
                )}
                <div className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                  {group.duas.map((dua) => (
                    <DuaRow key={dua.id} dua={dua} defaultOpen={openId === dua.id} />
                  ))}
                </div>
              </section>
            ),
        )}
      </div>
    </>
  );
}

type DuasPageProps = {
  category: string;
  /**
   * Reciting one by one: which dhikr (1-based), in a routine category.
   */
  recite?: number;
};

/**
 * One category of duas (`/duas/dzikir-pagi`). A routine (morning, evening,
 * after salah) lists every dhikr open with its counter and can be recited one
 * at a time (`?recite=1`); the others are references, by occasion. A
 * `#dua-id` (from search) opens and scrolls to that dua once it has loaded.
 * The title comes from the root head (`pageHead`), so search engines see the
 * same one.
 */
export function DuasPage(props: DuasPageProps) {
  const { category, recite } = props;
  const t = useT();
  const { language } = usePrefs();
  const hash = useLocation({ select: (l) => l.hash });
  const index = useQuery(duaQueries.index());
  const said = useSaidToday();
  const current = index.data?.categories.find((c) => c.slug === category);
  const duas = useQuery(duaQueries.category(category));
  const routine = ROUTINE_CATEGORIES.has(category);
  const doneCount = duas.data?.filter((d) => isSaid(d, said, language)).length ?? 0;
  const firstUnsaid = (duas.data?.findIndex((d) => !isSaid(d, said, language)) ?? 0) + 1 || 1;

  // Opened from search: bring that dua into view once its category has loaded.
  useEffect(() => {
    if (hash && duas.data) document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [hash, duas.data]);

  return (
    <PageShell title={current?.name[language] ?? t.duas}>
      {routine && recite && duas.data ? (
        <DuasFocus slug={category} duas={duas.data} index={recite} said={said} />
      ) : (
        <>
          <section className="dark relative mt-5 overflow-hidden rounded-[1.75rem] bg-(--ornament-field) px-6 py-6 text-foreground ring-1 ring-gold/30 sm:px-8">
            <Lattice className="opacity-50" />
            <div className="relative">
              <p dir="rtl" lang="ar" className="text-left font-kufi text-3xl text-gold sm:text-4xl">
                {CATEGORY_ARABIC[category]}
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.duaCategoryHints[category]}</p>
              {duas.data && !routine && (
                <p className="mt-3 text-xs text-muted-foreground">{t.duaCount(duas.data.length)}</p>
              )}
              {routine && duas.data && (
                <>
                  <span className="mt-5 block h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <span
                      className="block h-full rounded-full bg-gold transition-[width] duration-500"
                      style={{ width: `${(doneCount / duas.data.length) * 100}%` }}
                    />
                  </span>
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {doneCount === duas.data.length ? t.duaAllSaid : t.saidToday(doneCount, duas.data.length)}
                  </p>
                  <Link
                    to="/duas/$category"
                    params={{ category: DUA_URL_SLUGS[category] }}
                    search={{ recite: firstUnsaid }}
                    className="pressable mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85 [&_svg]:size-4">
                    <Play className="fill-current" />
                    {doneCount === 0 ? t.duaReciteOneByOne : t.continue}
                  </Link>
                </>
              )}
            </div>
          </section>

          <div className="mt-5">
            <ReadingControls />
          </div>

          {(index.isError || duas.isError) && <p className="mt-6 text-sm text-destructive">{t.duasLoadError}</p>}

          {duas.data &&
            (routine ? (
              <div className="mt-6 space-y-5">
                {duas.data.map((dua, i) => (
                  <DuaCard key={dua.id} dua={dua} number={i + 1} said={said[dua.id] ?? 0} />
                ))}
              </div>
            ) : (
              <ReferenceList key={category} slug={category} duas={duas.data} openId={hash} />
            ))}
          <p className="mt-10 text-center text-xs text-muted-foreground">{t.duasCredit}</p>
        </>
      )}
    </PageShell>
  );
}
