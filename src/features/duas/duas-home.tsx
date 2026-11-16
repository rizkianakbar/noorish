import { Link } from '@tanstack/react-router';
import { ArrowRight, BookHeart, CalendarDays, Moon, Play, Search, Sparkles, Sunrise } from 'lucide-react';
import { useState } from 'react';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { PageShell } from '#/components/page-shell.tsx';
import { Input } from '#/components/ui/input.tsx';
import { parseQuery } from '#/features/search/search.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { useAllDuas } from './duas.hooks.ts';
import {
  CATEGORY_ARABIC,
  categoryForHour,
  DUA_URL_SLUGS,
  isSaid,
  ROUTINE_CATEGORIES,
  searchDuas,
  shortTitle,
} from './duas.lib.ts';
import { useSaidToday } from './duas.store.ts';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'morning-dhikr': <Sunrise />,
  'evening-dhikr': <Moon />,
  'dhikr-after-salah': <Sparkles />,
  'daily-dua': <CalendarDays />,
  'selected-dua': <BookHeart />,
};

/**
 * `/duas`: the adhkar for this time of day up front (with today's progress
 * and one tap to recite them), a search across every dua, and the categories.
 */
export function DuasHome() {
  const t = useT();
  const { language } = usePrefs();
  const said = useSaidToday();
  const { categories, byCategory, isError } = useAllDuas();
  const [filter, setFilter] = useState('');
  const query = parseQuery(filter);
  const searching = query.terms.length > 0 || !!query.arabic;
  const hits = searching
    ? searchDuas(
        categories.flatMap((c) => (byCategory[c.slug] ?? []).map((dua) => ({ dua, category: c.slug }))),
        query,
        30,
      )
    : [];

  const progress = (slug: string) => {
    const duas = byCategory[slug];
    return duas ? { done: duas.filter((d) => isSaid(d, said, language)).length, total: duas.length } : null;
  };
  const nowSlug = categoryForHour(new Date().getHours());
  const now = categories.find((c) => c.slug === nowSlug);
  const nowProgress = progress(nowSlug);
  const nowRoutine = ROUTINE_CATEGORIES.has(nowSlug);
  const firstUnsaid = (byCategory[nowSlug]?.findIndex((d) => !isSaid(d, said, language)) ?? 0) + 1 || 1;

  return (
    <PageShell title={t.duas}>
      {now && (
        <section className="dark relative mt-5 overflow-hidden rounded-[1.75rem] bg-(--ornament-field) px-6 py-7 text-foreground ring-1 ring-gold/30 sm:px-8 sm:py-9">
          <Lattice className="opacity-50" />
          <div className="relative">
            <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">{t.duasForNow}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h2 className="font-serif text-3xl leading-tight">{now.name[language]}</h2>
              <p dir="rtl" lang="ar" className="font-kufi text-2xl text-gold">
                {CATEGORY_ARABIC[now.slug]}
              </p>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.duaCategoryHints[now.slug]}</p>
            {nowRoutine && nowProgress && (
              <div className="mt-5 max-w-sm">
                <span className="block h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <span
                    className="block h-full rounded-full bg-gold transition-[width] duration-500"
                    style={{ width: `${(nowProgress.done / nowProgress.total) * 100}%` }}
                  />
                </span>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {nowProgress.done === nowProgress.total
                    ? t.duaAllSaid
                    : t.saidToday(nowProgress.done, nowProgress.total)}
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              {nowRoutine ? (
                <Link
                  to="/duas/$category"
                  params={{ category: DUA_URL_SLUGS[nowSlug] }}
                  search={{ recite: firstUnsaid }}
                  className="pressable inline-flex h-12 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85 [&_svg]:size-4">
                  <Play className="fill-current" />
                  {nowProgress?.done ? t.continue : t.duaBegin}
                </Link>
              ) : null}
              <Link
                to="/duas/$category"
                params={{ category: DUA_URL_SLUGS[nowSlug] }}
                className={cn(
                  nowRoutine
                    ? 'text-sm text-muted-foreground underline-offset-4 hover:text-gold hover:underline'
                    : 'pressable inline-flex h-12 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85 [&_svg]:size-4',
                )}>
                {nowRoutine ? t.duaSeeList : t.duaCount(now.count)}
                {!nowRoutine && <ArrowRight />}
              </Link>
            </div>
          </div>
        </section>
      )}

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

      {isError && <p className="mt-6 text-sm text-destructive">{t.duasLoadError}</p>}

      {searching ? (
        hits.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">{t.noDuaMatch}</p>
        ) : (
          <ul className="mt-6 divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {hits.map(({ dua, category }) => (
              <li key={dua.id}>
                <Link
                  to="/duas/$category"
                  params={{ category: DUA_URL_SLUGS[category] }}
                  hash={dua.id}
                  className="flex min-h-14 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60">
                  <span className="min-w-0 grow">
                    <span className="block font-serif text-[1.0625rem] leading-snug">
                      {shortTitle(dua.title[language])}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {categories.find((c) => c.slug === category)?.name[language]}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <section aria-labelledby="dua-categories" className="mt-8">
          <h2 id="dua-categories" className="mb-3 px-1 text-xs font-medium tracking-[0.16em] text-gold-ink uppercase">
            {t.duaCategories}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {categories.map((c) => {
              const p = ROUTINE_CATEGORIES.has(c.slug) ? progress(c.slug) : null;
              return (
                <li key={c.slug}>
                  <Link
                    to="/duas/$category"
                    params={{ category: DUA_URL_SLUGS[c.slug] }}
                    className="pressable group flex h-full items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border hover:ring-gold/50">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold-ink ring-1 ring-gold/25 [&_svg]:size-5">
                      {CATEGORY_ICONS[c.slug]}
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block font-serif text-lg leading-snug">{c.name[language]}</span>
                      <span className="mt-0.5 flex items-baseline justify-between gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {p ? t.saidToday(p.done, p.total) : t.duaCount(c.count)}
                        </span>
                        <span dir="rtl" lang="ar" className="shrink-0 font-kufi text-sm text-gold-ink">
                          {CATEGORY_ARABIC[c.slug]}
                        </span>
                      </span>
                      {p && (
                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-border">
                          <span
                            className="block h-full rounded-full bg-gold"
                            style={{ width: `${(p.done / p.total) * 100}%` }}
                          />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <p className="mt-10 text-center text-xs text-muted-foreground">{t.duasCredit}</p>
    </PageShell>
  );
}
