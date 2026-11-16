import { Link } from '@tanstack/react-router';
import { ArrowRight, Check } from 'lucide-react';
import { Rosette } from '#/components/ornament/rosette.tsx';
import { usePlan } from '#/features/plans/plans.hooks.ts';
import { PlanBar } from '#/features/plans/plans-portion.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { useProgress } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { cn } from '#/lib/utils.ts';

const HERO_ROSETTE = { folds: 16, step: 5, rotation: 0, rings: 3 };

const cta =
  'pressable inline-flex h-12 max-w-full items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85 [&_svg]:size-4 [&_svg]:shrink-0';
const quietLink = 'text-sm text-muted-foreground underline-offset-4 hover:text-gold hover:underline';
const eyebrow = 'text-xs font-medium tracking-[0.18em] text-gold uppercase';

/**
 * The home page's frontispiece: the wordmark and tagline, and beside them
 * the one thing to do today with a single button. Today's plan portion while
 * it is unread, else the surah the reader is in, else a first surah. Anything
 * else (the other place to resume, the index) is a quiet link, so the hero
 * never offers two "Continue"s.
 */
export function HomeFrontispiece() {
  const t = useT();
  const { planOnHome } = usePrefs();
  const { lastRead } = useProgress();
  const { data: chapters = [], isError } = useChapters();
  const { plan, summary } = usePlan();
  const resume = lastRead ? chapters[lastRead.surah - 1] : undefined;
  const planned = planOnHome && plan && !plan.completedAt && summary?.portion && summary.next ? summary : null;
  const portionDone = !!planned && planned.portionRead >= planned.portionPages;
  const mode = planned && !portionDone ? 'plan' : resume && lastRead ? 'resume' : 'start';
  const next = planned?.next;
  const nextChapter = next ? chapters[next.surah - 1] : undefined;
  // Reading elsewhere than the plan's next verse: offered as a quiet second way in.
  const otherResume = mode === 'plan' && resume && lastRead && resume.number !== next?.surah;

  const allSurahs = (
    <a href="#index" className={quietLink}>
      {t.allSurahs}
    </a>
  );

  return (
    <section className="dark relative overflow-hidden rounded-[2rem] bg-(--ornament-field) text-foreground ring-1 ring-gold/30">
      <svg
        viewBox="0 0 400 400"
        aria-hidden="true"
        className={cn(
          'headpiece pointer-events-none absolute -top-12 -right-12 size-48 opacity-40',
          // Beside "today" it only peeks from the corner, so it never sits behind the text.
          mode === 'start'
            ? 'md:-top-24 md:-right-24 md:size-[26rem] md:opacity-20'
            : 'md:top-auto md:-right-32 md:-bottom-40 md:size-96 md:opacity-15',
        )}>
        <Rosette cx={200} cy={200} r={188} spec={HERO_ROSETTE} delay={150} />
      </svg>

      <div
        className={cn(
          'relative grid gap-7 p-6 sm:p-10 md:gap-10',
          mode !== 'start' && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center',
        )}>
        <div className="min-w-0">
          <p dir="rtl" lang="ar" className="text-left font-kufi text-4xl text-gold sm:text-5xl">
            نُورِيش
          </p>
          <h1 className="mt-3 max-w-md font-serif text-2xl leading-tight font-medium sm:text-4xl">{t.homeTagline}</h1>
          {mode === 'start' && (
            <>
              <p className="mt-3 max-w-md font-serif text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t.homeIntro}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link to="/surah/$surah" params={{ surah: 1 }} className={cta}>
                  {t.startReading}
                  <ArrowRight />
                </Link>
                {allSurahs}
              </div>
            </>
          )}
          {isError && <p className="mt-5 text-sm text-destructive">{t.dataMissing}</p>}
        </div>

        {mode !== 'start' && (
          // Today: a gold hairline sets it apart rather than a card within the card.
          <div className="min-w-0 border-t border-gold/20 pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-10">
            {mode === 'plan' && planned?.portion && next ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className={eyebrow}>{t.todaysReading}</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.planDayOf(Math.min(planned.day, planned.totalDays), planned.totalDays)}
                  </span>
                </div>
                <p className="mt-3 font-serif text-3xl leading-tight">
                  {t.planPages(planned.portion.fromPage, planned.portion.toPage)}
                </p>
                <PlanBar value={planned.portionRead / planned.portionPages} className="mt-4 bg-foreground/15" />
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {t.planPortionRead(planned.portionRead, planned.portionPages)} · {t.planDaysLeft(planned.daysLeft)}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link to="/surah/$surah" params={{ surah: next.surah }} hash={`v${next.verse}`} className={cta}>
                    <span className="truncate">
                      {t.planContinue} · {nextChapter?.nameSimple} {next.surah}:{next.verse}
                    </span>
                    <ArrowRight />
                  </Link>
                  {otherResume && lastRead ? (
                    <Link
                      to="/surah/$surah"
                      params={{ surah: resume.number }}
                      hash={`v${lastRead.verse}`}
                      className={quietLink}>
                      {t.orResume(`${resume.nameSimple} ${resume.number}:${lastRead.verse}`)}
                    </Link>
                  ) : (
                    allSurahs
                  )}
                </div>
              </>
            ) : (
              resume &&
              lastRead && (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className={eyebrow}>{t.continueReading}</h2>
                    {portionDone && (
                      <span className="flex items-center gap-1 text-xs text-gold tabular-nums">
                        <Check className="size-3.5" />
                        {t.planTodayDone}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-4">
                    <p className="min-w-0 truncate font-serif text-3xl leading-tight">{resume.nameSimple}</p>
                    <p dir="rtl" lang="ar" className="shrink-0 font-kufi text-2xl text-gold">
                      {resume.nameArabic}
                    </p>
                  </div>
                  <PlanBar value={lastRead.verse / resume.versesCount} className="mt-4 bg-foreground/15" />
                  <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                    {t.versesRead(lastRead.verse, resume.versesCount)}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Link
                      to="/surah/$surah"
                      params={{ surah: resume.number }}
                      hash={`v${lastRead.verse}`}
                      className={cta}>
                      {t.planContinue} · {t.verseShort(lastRead.verse)}
                      <ArrowRight />
                    </Link>
                    {allSurahs}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
