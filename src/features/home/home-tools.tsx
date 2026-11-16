import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Brain, Clock, Compass, HandHeart, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import { duaQueries } from '#/features/duas/duas.api.ts';
import { categoryForHour } from '#/features/duas/duas.lib.ts';
import { duePassages, passageLabel } from '#/features/memorize/memorize.lib.ts';
import { memorizeStore } from '#/features/memorize/memorize.store.ts';
import { usePrayerDay } from '#/features/prayer/prayer.hooks.ts';
import { compassPoint, minutesUntil, qiblaBearing } from '#/features/prayer/prayer.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { dateKey } from '#/lib/progress.ts';
import { useChapters } from '#/lib/quran/data.ts';

// Phones: compact tiles (icon over label and value) side by side; wider screens: rows with the icon beside.
const card =
  'pressable group relative flex min-w-0 flex-col items-start gap-2.5 rounded-2xl border bg-card p-3.5 hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-gold sm:flex-row sm:items-center sm:gap-4 sm:p-5';
const heading = 'text-xs font-medium tracking-[0.18em] text-gold-ink uppercase';

type CardBodyProps = { icon: ReactNode; label: string; value: string; detail?: string };

function CardBody(props: CardBodyProps) {
  const { icon, label, value, detail } = props;
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold-ink ring-1 ring-gold/25 transition-colors group-hover:bg-gold/20 sm:size-11 [&_svg]:size-4 sm:[&_svg]:size-5">
        {icon}
      </span>
      <span className="w-full min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
        <span className="line-clamp-2 block font-serif text-[0.9375rem] leading-snug tabular-nums sm:truncate sm:text-lg">
          {value}
        </span>
        {detail && <span className="block truncate text-xs text-muted-foreground tabular-nums">{detail}</span>}
      </span>
    </>
  );
}

/**
 * What the hour asks for: the next prayer, the qibla and this time of day's
 * dhikr, each with the one thing worth knowing at a glance.
 */
export function HomeNow() {
  const t = useT();
  const { language } = usePrefs();
  const { place, day, now } = usePrayerDay();
  const bearing = place ? qiblaBearing(place) : null;
  const duaCategories = useQuery(duaQueries.index()).data?.categories;
  // Names the dhikr for this time of day, which the duas page leads with.
  const dhikr = duaCategories?.find((c) => c.slug === categoryForHour(now.getHours()))?.name[language] ?? t.duas;

  return (
    <section aria-labelledby="home-now" className="mt-8 sm:mt-10">
      <h2 id="home-now" className={heading}>
        {t.now}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        <Link to="/prayer-times" className={card}>
          <CardBody
            icon={<Clock />}
            label={t.nextPrayer}
            value={
              place && day
                ? `${t.prayerNames[day.next.name]} ${new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', timeZone: place.timezone }).format(day.next.at)}`
                : t.setLocation
            }
            detail={day ? t.inDuration(minutesUntil(day.next.at, now)) : undefined}
          />
        </Link>
        <Link to="/qibla" className={card}>
          <CardBody
            icon={<Compass />}
            label={t.qibla}
            value={bearing === null ? t.setLocation : `${Math.round(bearing)}° ${compassPoint(bearing)}`}
          />
        </Link>
        <Link to="/duas" className={card}>
          <CardBody icon={<HandHeart />} label={t.duas} value={dhikr} />
        </Link>
      </div>
    </section>
  );
}

/**
 * The tools a reader returns to: memorizing (with what's due) and hadith.
 * New practice tools add a card here.
 */
export function HomePractice() {
  const t = useT();
  const { learning, passages } = memorizeStore.use();
  const dueCount = duePassages(passages, dateKey(new Date())).length;
  const chapters = useChapters().data;

  return (
    <section aria-labelledby="home-practice" className="mt-8 sm:mt-10">
      <h2 id="home-practice" className={heading}>
        {t.practice}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <Link to="/memorize" search={{}} className={card}>
          <CardBody
            icon={<Brain />}
            label={t.memorize}
            value={
              dueCount > 0
                ? t.dueCount(dueCount)
                : learning
                  ? passageLabel(chapters?.[learning.range.surah - 1]?.nameSimple, learning.range)
                  : t.memorizeStartShort
            }
          />
          {dueCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-3 right-3 flex h-6 min-w-6 shrink-0 sm:static sm:ml-auto sm:h-7 sm:min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground tabular-nums">
              {dueCount}
            </span>
          )}
        </Link>
        <Link to="/hadith" className={card}>
          <CardBody icon={<ScrollText />} label={t.hadith} value={t.hadithCollections.nawawi} />
        </Link>
      </div>
    </section>
  );
}
