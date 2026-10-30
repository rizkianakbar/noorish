import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { type PrayerDay, prayerHistory, prayerKey, prayerStreak, SALAH, todayIn } from './prayer.lib.ts';
import { markPrayed, prayerLogStore, unmarkPrayed } from './prayer.store.ts';
import type { Place } from './prayer.types.ts';

const WEEK = 7;
const WEEKS = 12;

/**
 * A day in the heatmap, gilded more for each of its five prayers.
 */
function heat(count: number) {
  return count ? { backgroundColor: `color-mix(in oklab, var(--gold) ${20 + count * 16}%, var(--muted))` } : undefined;
}

type PrayerHistoryProps = { place: Place; day: PrayerDay; now: Date };

/**
 * The prayer log: the run of complete days, this week prayer by prayer (tap
 * to log or undo), and twelve weeks at a glance, each day gilded by how many
 * of its five were prayed.
 */
export function PrayerHistory(props: PrayerHistoryProps) {
  const { place, day, now } = props;
  const t = useT();
  const { language } = usePrefs();
  const log = prayerLogStore.use();
  const today = todayIn(place, now);

  const days = useMemo(() => prayerHistory(log, today, day, now, WEEKS * WEEK), [log, today, day, now]);
  const streak = useMemo(() => prayerStreak(log, today), [log, today]);
  const week = days.slice(0, WEEK);
  const weekCount = week.reduce((sum, d) => sum + d.count, 0);

  // Date keys are plain dates: format them in UTC so no zone shifts the day.
  const weekday = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' });
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' });
  const asDate = (key: string) => new Date(`${key}T00:00:00Z`);
  // Oldest first, so each column of the heatmap is one week, reading left to right.
  const oldestFirst = [...days].reverse();

  return (
    <section aria-labelledby="prayer-history" className="space-y-5">
      <div>
        <h2 id="prayer-history" className="font-serif text-2xl">
          {t.history}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.historyHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="dark relative overflow-hidden rounded-2xl bg-(--ornament-field) p-4 text-foreground ring-1 ring-gold/30">
          <p className="text-[11px] font-medium tracking-[0.16em] text-gold uppercase">{t.historyStreakLabel}</p>
          <p className="mt-1.5 font-serif text-3xl tabular-nums">{t.historyStreak(streak.current)}</p>
          {streak.best > streak.current && (
            <p className="mt-0.5 text-xs text-muted-foreground">{t.historyBest(streak.best)}</p>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-[11px] font-medium tracking-[0.16em] text-gold-ink uppercase">{t.historyWeek}</p>
          <p className="mt-1.5 font-serif text-3xl tabular-nums">
            {weekCount}
            <span className="text-lg text-muted-foreground">/{WEEK * SALAH.length}</span>
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
              style={{ width: `${(weekCount / (WEEK * SALAH.length)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card px-2 py-3 sm:px-4">
        <div className="grid grid-cols-[4.5rem_repeat(5,1fr)] items-center gap-y-1 text-center">
          <span />
          {SALAH.map((name) => (
            <span key={name} className="truncate pb-1 text-[11px] font-medium text-muted-foreground">
              {t.prayerNames[name]}
            </span>
          ))}
          {week.map((row, i) => (
            <div key={row.day} className="contents">
              <span className={cn('text-left text-sm', i === 0 ? 'font-medium' : 'text-muted-foreground')}>
                {weekday.format(asDate(row.day))}
                <span className="block text-[11px] text-muted-foreground tabular-nums">
                  {t.historyDayCount(row.count)}
                </span>
              </span>
              {SALAH.map((name) => {
                const state = row.prayers[name];
                const key = prayerKey(row.day, name);
                return (
                  <span key={name} className="flex justify-center">
                    <button
                      type="button"
                      disabled={state === 'upcoming'}
                      aria-pressed={state === 'prayed'}
                      aria-label={t.historyToggle(
                        t.prayerNames[name],
                        fullDate.format(asDate(row.day)),
                        state === 'prayed',
                      )}
                      onClick={() => {
                        if (state === 'prayed') unmarkPrayed(key);
                        else {
                          markPrayed(key);
                          navigator.vibrate?.(10);
                        }
                      }}
                      className={cn(
                        'pressable flex size-9 items-center justify-center rounded-full transition-[background-color,box-shadow,color] duration-200 [--press-scale:0.88] [&_svg]:size-4',
                        state === 'prayed' &&
                          'bg-gold text-lapis shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_22%,transparent)]',
                        state === 'open' && 'text-transparent ring-1 ring-border ring-inset hover:ring-gold/60',
                        state === 'upcoming' && 'cursor-default border border-dashed text-transparent',
                      )}>
                      <Check strokeWidth={3} />
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {t.historyMonth}
        </p>
        <div className="grid grid-flow-col grid-rows-7 justify-start gap-1" role="img" aria-label={t.historyMonth}>
          {oldestFirst.map((d) => (
            <span
              key={d.day}
              title={`${fullDate.format(asDate(d.day))} · ${t.historyDayCount(d.count)}`}
              className={cn(
                'size-3.5 rounded-[4px] bg-muted',
                d.day === today && 'ring-1 ring-gold ring-offset-1 ring-offset-background',
              )}
              style={heat(d.count)}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="mr-1">{t.historyLess}</span>
          {[0, 1, 2, 3, 4, 5].map((count) => (
            <span key={count} className="size-2.5 rounded-[3px] bg-muted" style={heat(count)} />
          ))}
          <span className="ml-1">{t.historyMore}</span>
        </div>
      </div>
    </section>
  );
}
