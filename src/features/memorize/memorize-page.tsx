import { PageShell } from '#/components/page-shell.tsx';
import { useT } from '#/lib/i18n.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { parseRange } from './memorize.lib.ts';
import { MemorizeHome } from './memorize-home.tsx';
import { MemorizeSession } from './memorize-session.tsx';

export interface MemorizeSearch {
  surah?: number;
  from?: number;
  to?: number;
  /**
   * Review a memorized passage (recite it whole) instead of learning it.
   */
  mode?: 'review';
}

type MemorizePageProps = { search: MemorizeSearch };

/**
 * `/memorize` is the Memorize home; `/memorize?surah=67&from=1&to=5` learns
 * that passage (`&mode=review` reviews it), so a passage can be bookmarked or
 * shared, and Back returns home.
 */
export function MemorizePage(props: MemorizePageProps) {
  const { search } = props;
  const t = useT();
  const { data: chapters } = useChapters();
  const range = chapters ? parseRange(search, (n) => chapters[n - 1]?.versesCount) : null;

  return (
    <PageShell title={t.memorize} ownTitle>
      <div className="mt-6">
        {chapters &&
          (range ? (
            <MemorizeSession
              key={`${range.surah}:${range.from}-${range.to}:${search.mode ?? 'learn'}`}
              range={range}
              chapter={chapters[range.surah - 1]}
              mode={search.mode ?? 'learn'}
            />
          ) : (
            <MemorizeHome chapters={chapters} />
          ))}
      </div>
    </PageShell>
  );
}
