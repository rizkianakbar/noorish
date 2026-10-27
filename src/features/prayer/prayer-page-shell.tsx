import { MapPin } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { PageShell } from '#/components/page-shell.tsx';
import { Button } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { prayerStore } from './prayer.store.ts';
import type { Place } from './prayer.types.ts';
import { PrayerLocationPicker } from './prayer-location.tsx';

type PrayerPageShellProps = { title: string; children: (place: Place) => ReactNode };

/**
 * The frame both prayer pages share: back, title, and the place they're for,
 * with the picker in place of the content until a place is chosen.
 */
export function PrayerPageShell(props: PrayerPageShellProps) {
  const { title, children } = props;
  const t = useT();
  const { place } = prayerStore.use();
  const [picking, setPicking] = useState(false);

  return (
    <PageShell title={title} ownTitle>
      {place && !picking ? (
        <>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-gold-ink [&_svg]:size-3.5">
            <MapPin />
            <span>
              {place.name ?? t.currentLocation}
              {place.detail && <span className="opacity-75">, {place.detail}</span>}
            </span>
            <span aria-hidden="true">·</span>
            <span className="underline-offset-4 hover:underline">{t.changeLocation}</span>
          </button>
          <div className="mt-8">{children(place)}</div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border bg-card p-5">
          <p className="mb-4 text-sm text-muted-foreground">{t.locationPrompt}</p>
          <PrayerLocationPicker onDone={() => setPicking(false)} />
          {place && (
            <Button variant="ghost" size="sm" className="mt-3 -ml-2.5" onClick={() => setPicking(false)}>
              {t.cancel}
            </Button>
          )}
        </div>
      )}
    </PageShell>
  );
}
