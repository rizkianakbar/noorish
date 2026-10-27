import { useMutation, useQuery } from '@tanstack/react-query';
import { LocateFixed, MapPin } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { Field, FieldLabel } from '#/components/ui/field.tsx';
import { Input } from '#/components/ui/input.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { currentPlace, LocationError, placeQueries } from './prayer.api.ts';
import { setPrayerSetting } from './prayer.store.ts';
import type { Place } from './prayer.types.ts';

type PrayerLocationPickerProps = { onDone?: () => void };

/**
 * Choose where prayer times and the qibla are for: the device's position,
 * or a city searched by name. `onDone` runs once one is chosen.
 */
export function PrayerLocationPicker(props: PrayerLocationPickerProps) {
  const { onDone } = props;
  const t = useT();
  const { language } = usePrefs();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());

  const cities = useQuery(placeQueries.search(deferred, language));

  const choose = (place: Place) => {
    setPrayerSetting('place', place);
    onDone?.();
  };

  const locate = useMutation({ mutationFn: currentPlace, onSuccess: choose });
  const locateError =
    locate.error &&
    (locate.error instanceof LocationError && locate.error.reason === 'denied'
      ? t.locationDenied
      : t.locationUnavailable);

  return (
    <div className="space-y-4">
      <Button size="lg" onClick={() => locate.mutate()} disabled={locate.isPending} className="w-full sm:w-auto">
        <LocateFixed data-icon="inline-start" />
        {locate.isPending ? t.locating : t.useMyLocation}
      </Button>
      {locateError && <p className="text-sm text-muted-foreground">{locateError}</p>}

      <Field>
        <FieldLabel htmlFor="prayer-city" className="sr-only">
          {t.searchCity}
        </FieldLabel>
        <Input
          id="prayer-city"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchCity}
          className="h-9"
        />
        {deferred.length >= 2 && (
          <ul className="mt-2 divide-y rounded-lg border" aria-live="polite">
            {cities.isError && <li className="px-3 py-2.5 text-sm text-muted-foreground">{t.cityError}</li>}
            {cities.data?.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-muted-foreground">{t.noCityMatch}</li>
            )}
            {cities.data?.map((city) => (
              <li key={`${city.lat},${city.lng}`}>
                <button
                  type="button"
                  onClick={() => choose(city)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted">
                  <MapPin className="size-4 shrink-0 text-gold-ink" />
                  <span className="min-w-0">
                    <span className="block truncate">{city.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{city.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <p className="text-xs text-muted-foreground">{t.locationPrivacy}</p>
    </div>
  );
}
