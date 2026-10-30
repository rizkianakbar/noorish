import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { Button } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';
import { usePrayerDay } from './prayer.hooks.ts';
import { ARABIC_NAMES, minutesUntil, prayerKey, reminderDue, SALAH } from './prayer.lib.ts';
import { markPrayed, prayerLogStore, reminderStore, snoozeReminder } from './prayer.store.ts';
import type { SalahName } from './prayer.types.ts';

/**
 * Asked again this long after "I'll pray now" or "Not now", if it is still
 * that prayer's time.
 */
const SNOOZE_MINUTES = 20;
const THANKS_MS = 3500;

/**
 * "It's Isha time. Have you prayed?" Asked once per prayer when the app is
 * open during its time. "Yes" logs it, thanks with the day's five so far,
 * and stops asking for that prayer; "Not yet" encourages, with the time left and Al-Baqarah 2:238, and
 * checks back later. Warm, never nagging: each answer is final until the
 * snooze ends or the next prayer begins.
 */
export function PrayerReminder() {
  const t = useT();
  const { day, now } = usePrayerDay();
  const state = reminderStore.use();
  const log = prayerLogStore.use();
  const [encouraging, setEncouraging] = useState(false);
  const [thanked, setThanked] = useState<{ prayer: SalahName; day: string } | null>(null);
  const due = day ? reminderDue(day, now, state, log) : null;

  useEffect(() => {
    if (!thanked) return;
    const timer = setTimeout(() => setThanked(null), THANKS_MS);
    return () => clearTimeout(timer);
  }, [thanked]);

  const prayer = thanked?.prayer ?? due?.prayer;
  if (!prayer) return null;
  const name = t.prayerNames[prayer];

  return (
    <div
      role="status"
      className="dark fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 mx-auto max-w-md animate-in overflow-hidden rounded-[1.5rem] bg-(--ornament-field) text-foreground shadow-[0_18px_50px_-12px_oklch(0.15_0.05_262/0.7)] ring-1 ring-gold/45 duration-300 fade-in slide-in-from-top-3">
      <Lattice className="opacity-50" />
      <div className="relative px-5 pt-4 pb-5">
        {thanked ? (
          <div className="flex items-center gap-3 py-1">
            <span className="flex size-8 shrink-0 animate-in items-center justify-center rounded-full bg-gold text-lapis duration-300 zoom-in-50 [&_svg]:size-4">
              <Check />
            </span>
            <div className="min-w-0">
              <p className="text-sm">{t.reminderThanks}</p>
              <p className="mt-1.5 flex items-center gap-1.5">
                {SALAH.map((name) => (
                  <span
                    key={name}
                    aria-hidden="true"
                    className={cn(
                      'size-1.5 rounded-full bg-foreground/20',
                      log[prayerKey(thanked.day, name)] && 'bg-gold',
                    )}
                  />
                ))}
                <span className="ml-1 text-xs text-muted-foreground">
                  {t.historyDayCount(dayCount(log, thanked.day))}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="min-w-0 grow">
                <p className="text-xs font-medium tracking-[0.16em] text-gold uppercase">{t.reminderTitle(name)}</p>
                <p className="mt-1 font-serif text-xl">{t.reminderAsk}</p>
              </div>
              <p dir="rtl" lang="ar" className="shrink-0 font-kufi text-2xl text-gold">
                {ARABIC_NAMES[prayer]}
              </p>
              <button
                type="button"
                aria-label={t.reminderLater}
                title={t.reminderLater}
                onClick={() => due && snoozeReminder(due.id, SNOOZE_MINUTES)}
                className="pressable -mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground [--press-scale:0.9] hover:text-foreground [&_svg]:size-4">
                <X />
              </button>
            </div>

            {encouraging && due ? (
              <div className="mt-3 animate-in space-y-3 duration-300 fade-in">
                <p className="text-sm leading-relaxed">
                  {t.reminderEncourage(t.durationLeft(minutesUntil(due.endsAt, now)))}
                </p>
                <blockquote className="rounded-r-lg border-l-2 border-gold bg-gold/10 px-3.5 py-2.5">
                  <p className="font-serif text-[0.9375rem] leading-relaxed italic">{t.reminderVerse}</p>
                  <cite className="mt-1 block text-xs text-gold not-italic">{t.reminderVerseRef}</cite>
                </blockquote>
                <Button
                  size="lg"
                  variant="gold"
                  className="h-11 w-full rounded-full"
                  onClick={() => {
                    setEncouraging(false);
                    snoozeReminder(due.id, SNOOZE_MINUTES);
                  }}>
                  {t.reminderPrayNow}
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 flex-1 rounded-full"
                  onClick={() => setEncouraging(true)}>
                  {t.reminderNo}
                </Button>
                <Button
                  size="lg"
                  variant="gold"
                  className="h-11 flex-1 rounded-full"
                  onClick={() => {
                    if (!due) return;
                    markPrayed(due.id);
                    setThanked({ prayer: due.prayer, day: due.id.slice(0, 10) });
                    navigator.vibrate?.(15);
                  }}>
                  {t.reminderYes}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function dayCount(log: Record<string, number>, day: string) {
  return SALAH.filter((name) => log[prayerKey(day, name)]).length;
}
