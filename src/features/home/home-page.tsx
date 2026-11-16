import { Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { ChoiceGroup } from '#/components/choice-group.tsx';
import { Input } from '#/components/ui/input.tsx';
import { matchesChapter } from '#/features/surahs/surahs.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { useProgress } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { HomeFrontispiece } from './home-frontispiece.tsx';
import { HomeIndexRow } from './home-index-row.tsx';
import { HomePlanInvite } from './home-plan.tsx';
import { HomeNow, HomePractice } from './home-tools.tsx';
import { HomeVerseOfDay } from './home-verse-of-day.tsx';

type IndexFilter = 'all' | 'started' | 'makkah' | 'madinah';

export function HomePage() {
  const t = useT();
  const { furthest } = useProgress();
  const { data: chapters = [] } = useChapters();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<IndexFilter>('all');
  const deferredQuery = useDeferredValue(query.trim());

  const shown = chapters.filter(
    (c) =>
      (filter === 'all' ||
        (filter === 'started'
          ? (furthest[c.number] ?? 0) > 0 && (furthest[c.number] ?? 0) < c.versesCount
          : c.revelationPlace === filter)) &&
      (!deferredQuery || matchesChapter(c, deferredQuery)),
  );

  return (
    <main id="main-content" className="min-w-0 grow">
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-40 sm:px-8 sm:pt-10">
        <HomeFrontispiece />
        <HomePlanInvite />
        {/* Phones: the tools sit together and the verse follows; wider screens keep the verse between them. */}
        <div className="flex flex-col">
          <HomeNow />
          <div className="order-last sm:order-none">
            <HomeVerseOfDay />
          </div>
          <HomePractice />
        </div>

        <section id="index" aria-labelledby="index-title" className="mt-14 scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="index-title" className="font-serif text-2xl">
              {t.allSurahs}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.filterSurahs}
                aria-label={t.filterSurahs}
                className="h-10 rounded-full pl-9"
              />
            </div>
          </div>
          <ChoiceGroup
            label={t.allSurahs}
            value={filter}
            onChange={setFilter}
            className="mt-4"
            options={[
              { value: 'all', label: t.all },
              { value: 'started', label: t.inProgress },
              { value: 'makkah', label: t.makkah },
              { value: 'madinah', label: t.madinah },
            ]}
          />
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {deferredQuery ? `${t.noSurahMatch} “${deferredQuery}”` : t.noSurahMatch}
            </p>
          )}
          <ul className="mt-2 grid grid-cols-1 gap-x-12 lg:grid-cols-2">
            {shown.map((chapter) => (
              <HomeIndexRow key={chapter.number} chapter={chapter} read={furthest[chapter.number] ?? 0} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
