import { ChoiceGroup, OnOffChoice } from '#/components/choice-group.tsx';
import { ChoiceSelect } from '#/components/choice-select.tsx';
import { SettingsRow } from '#/features/settings/settings-controls.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { usePrayerDay } from './prayer.hooks.ts';
import { ARABIC_NAMES, METHODS, minutesUntil, PRAYERS } from './prayer.lib.ts';
import { setPrayerSetting } from './prayer.store.ts';
import type { MethodId, Place, PrayerSettings } from './prayer.types.ts';
import { PrayerHistory } from './prayer-history.tsx';
import { PrayerNotifySettings } from './prayer-notify.tsx';
import { PrayerPageShell } from './prayer-page-shell.tsx';

type PrayerTimesProps = { place: Place };

function PrayerTimes(props: PrayerTimesProps) {
  const { place } = props;
  const t = useT();
  const { language } = usePrefs();
  const { day, now, settings, method } = usePrayerDay();
  if (!day || !method) return null;

  const time = new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', timeZone: place.timezone });
  const gregorian = new Intl.DateTimeFormat(language, { dateStyle: 'full', timeZone: place.timezone });
  const hijri = new Intl.DateTimeFormat(`${language}-u-ca-islamic-umalqura`, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: place.timezone,
  });
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-8">
      {/* The next prayer, set like the frontispiece: the one thing to know at a glance. */}
      <section className="dark relative overflow-hidden rounded-[1.75rem] bg-(--ornament-field) p-6 text-foreground ring-1 ring-gold/30 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">{t.prayerNames[day.next.name]}</p>
            <p className="mt-2 font-serif text-5xl tabular-nums">{time.format(day.next.at)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t.inDuration(minutesUntil(day.next.at, now))}</p>
          </div>
          <p dir="rtl" lang="ar" className="font-kufi text-4xl text-gold-ink sm:text-5xl">
            {ARABIC_NAMES[day.next.name]}
          </p>
        </div>
      </section>

      <section>
        <p className="text-sm">{gregorian.format(now)}</p>
        <p className="text-sm text-muted-foreground">{hijri.format(now)}</p>
        <ol className="mt-4 divide-y rounded-xl border bg-card">
          {PRAYERS.map((name) => {
            const isCurrent = day.current === name;
            return (
              <li
                key={name}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5',
                  name === 'sunrise' && 'text-muted-foreground',
                  isCurrent && 'bg-gold/10',
                )}>
                <span className="w-24 font-medium">{t.prayerNames[name]}</span>
                <span dir="rtl" lang="ar" className="font-kufi text-lg text-gold-ink/80">
                  {ARABIC_NAMES[name]}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-medium text-gold-ink">
                    {t.prayerNow}
                  </span>
                )}
                <span className="ml-auto font-serif text-lg tabular-nums">{time.format(day.times[name])}</span>
              </li>
            );
          })}
        </ol>
        {place.timezone !== deviceZone && (
          <p className="mt-2 text-xs text-muted-foreground">{t.timesIn(place.timezone.replaceAll('_', ' '))}</p>
        )}
      </section>

      <PrayerHistory place={place} day={day} now={now} />

      <section className="divide-y border-t">
        <SettingsRow label={t.calculationMethod} htmlFor="prayer-method">
          <ChoiceSelect<PrayerSettings['method']>
            id="prayer-method"
            value={settings.method}
            onChange={(value) => setPrayerSetting('method', value)}
            options={[
              { value: 'auto', label: t.methodAuto(METHODS[method].label) },
              ...(Object.keys(METHODS) as MethodId[]).map((id) => ({ value: id, label: METHODS[id].label })),
            ]}
            className="max-w-full"
          />
        </SettingsRow>
        <SettingsRow label={t.prayerReminders} hint={t.prayerRemindersHint}>
          <OnOffChoice
            label={t.prayerReminders}
            value={settings.reminders}
            onChange={(on) => setPrayerSetting('reminders', on)}
          />
        </SettingsRow>
        <PrayerNotifySettings />
        <SettingsRow label={t.asrTime}>
          <ChoiceGroup<PrayerSettings['madhab']>
            label={t.asrTime}
            value={settings.madhab}
            onChange={(v) => setPrayerSetting('madhab', v)}
            options={[
              { value: 'shafi', label: t.asrStandard },
              { value: 'hanafi', label: t.asrHanafi },
            ]}
          />
        </SettingsRow>
      </section>
    </div>
  );
}

export function PrayerTimesPage() {
  const t = useT();
  return <PrayerPageShell title={t.prayerTimes}>{(place) => <PrayerTimes place={place} />}</PrayerPageShell>;
}
