import { lazy, type ReactNode, Suspense, useEffect } from 'react';
import { Dock } from '#/features/dock/dock.tsx';
import { DockSheet } from '#/features/dock/dock-sheet.tsx';
import { usePlanSync } from '#/features/plans/plans.hooks.ts';
import { prayerStore } from '#/features/prayer/prayer.store.ts';
import { hideSplash } from '#/features/pwa/pwa.lib.ts';
import { PwaUpdatePrompt } from '#/features/pwa/pwa-update-prompt.tsx';
import { useT } from '#/lib/i18n.ts';
import {
  useApplyPrefs,
  useGlobalShortcuts,
  usePrayerPush,
  usePrefetchAllSurahs,
  useServiceWorker,
} from './app-shell.hooks.ts';

// Split out: it brings the prayer-times library, which only readers with a place need.
const PrayerReminder = lazy(() =>
  import('#/features/prayer/prayer-reminder.tsx').then((m) => ({ default: m.PrayerReminder })),
);

/**
 * Full-bleed pages with a floating dock instead of side rails: the reading
 * column always owns the whole width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const prayer = prayerStore.use();

  useApplyPrefs();
  useGlobalShortcuts();
  usePrefetchAllSurahs();
  usePlanSync();
  useServiceWorker();
  usePrayerPush(Boolean(prayer.place && prayer.notify));
  // The installed app's splash leaves once the page under it is ready.
  useEffect(hideSplash, []);

  return (
    // The document scrolls, not an inner box (see `src/lib/page-scroll.ts`). With
    // viewport-fit=cover the side insets keep content clear of the notch in landscape.
    <div className="flex min-h-dvh pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-60 focus:rounded-full focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:ring-1 focus:ring-gold">
        {t.skipToContent}
      </a>
      <div className="relative flex min-w-0 grow">{children}</div>
      <DockSheet />
      <PwaUpdatePrompt />
      {prayer.place && prayer.reminders && (
        <Suspense fallback={null}>
          <PrayerReminder />
        </Suspense>
      )}
      <Dock />
    </div>
  );
}
