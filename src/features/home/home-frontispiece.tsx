import { Link } from '@tanstack/react-router';
import { Rosette } from '#/components/ornament/rosette.tsx';
import { PlanBar } from '#/features/plans/plans-portion.tsx';
import { useT } from '#/lib/i18n.ts';
import { useProgress } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { HomePlan } from './home-plan.tsx';

const HERO_ROSETTE = { folds: 16, step: 5, rotation: 0, rings: 3 };

export function HomeFrontispiece() {
  const t = useT();
  const { lastRead } = useProgress();
  const { data: chapters = [], isError } = useChapters();
  const resume = lastRead ? chapters[lastRead.surah - 1] : undefined;

  return (
    <section className="dark relative overflow-hidden rounded-[2rem] bg-(--ornament-field) text-foreground ring-1 ring-gold/30">
      <svg
        viewBox="0 0 400 400"
        aria-hidden="true"
        className="headpiece pointer-events-none absolute -top-10 -right-10 size-44 opacity-50 md:-top-20 md:-right-20 md:size-96 md:opacity-25">
        <Rosette cx={200} cy={200} r={188} spec={HERO_ROSETTE} delay={150} />
      </svg>

      {/* "Continue reading" and today's plan side by side; the plan wraps below on phones or is absent. */}
      <div className="flex flex-wrap items-center gap-8 p-6 sm:p-12">
        <div className="relative z-10 min-w-0 flex-1 basis-96">
          <p dir="rtl" lang="ar" className="text-left font-kufi text-4xl text-gold-ink sm:text-6xl">
            نُورِيش
          </p>
          <h1 className="mt-3 font-serif text-2xl leading-tight font-medium sm:mt-5 sm:text-4xl">{t.homeTagline}</h1>
          {!resume && (
            <p className="mt-3 max-w-md font-serif text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {t.homeIntro}
            </p>
          )}

          {isError && <p className="mt-6 text-sm text-destructive">{t.dataMissing}</p>}

          {resume && lastRead && (
            <div className="mt-6 max-w-sm sm:mt-8">
              <div className="flex justify-between gap-3 text-sm text-muted-foreground tabular-nums">
                <span className="truncate">
                  {resume.nameSimple} · {t.versesRead(lastRead.verse, resume.versesCount)}
                </span>
                <span>{Math.round((lastRead.verse / resume.versesCount) * 100)}%</span>
              </div>
              <PlanBar value={lastRead.verse / resume.versesCount} className="mt-2 bg-foreground/15" />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            {resume && lastRead ? (
              <Link
                to="/surah/$surah"
                params={{ surah: resume.number }}
                hash={`v${lastRead.verse}`}
                className="pressable inline-flex h-12 items-center rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85">
                {t.continueReading}: {resume.nameSimple}, {t.verseShort(lastRead.verse).toLowerCase()}
              </Link>
            ) : (
              <Link
                to="/surah/$surah"
                params={{ surah: 1 }}
                className="pressable inline-flex h-12 items-center rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85">
                {t.startReading}
              </Link>
            )}
            <a
              href="#index"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-gold-ink hover:underline">
              {t.allSurahs}
            </a>
          </div>
        </div>

        <HomePlan />
      </div>
    </section>
  );
}
