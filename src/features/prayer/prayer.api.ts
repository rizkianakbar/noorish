import { queryOptions } from '@tanstack/react-query';
import type { Language } from '#/lib/prefs.ts';
import { countryForTimezone } from './prayer.lib.ts';
import type { Place, PlaceResult } from './prayer.types.ts';

/**
 * Open-Meteo's geocoder: free, keyless, CORS-enabled. Only the typed name is sent.
 */
const GEOCODER = 'https://geocoding-api.open-meteo.com/v1/search';

interface GeocoderResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
}

export async function searchPlaces(query: string, language: Language): Promise<PlaceResult[]> {
  const url = `${GEOCODER}?${new URLSearchParams({ name: query, count: '6', language, format: 'json' })}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Geocoder responded ${response.status}`);
  const { results = [] } = (await response.json()) as { results?: GeocoderResult[] };
  return results
    .filter((r) => r.timezone)
    .map((r) => ({
      name: r.name,
      detail: [r.admin1, r.country].filter(Boolean).join(', '),
      lat: r.latitude,
      lng: r.longitude,
      timezone: r.timezone as string,
      country: r.country_code,
    }));
}

export class LocationError extends Error {
  constructor(readonly reason: 'denied' | 'unavailable') {
    super(reason);
  }
}

/**
 * The device's position, in the device's own time zone.
 */
export function currentPlace(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new LocationError('unavailable'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        resolve({
          name: null,
          // Rounded to ~1 km: plenty for prayer times, and less precise to keep.
          lat: Math.round(coords.latitude * 100) / 100,
          lng: Math.round(coords.longitude * 100) / 100,
          timezone,
          country: countryForTimezone(timezone),
        });
      },
      (error) => reject(new LocationError(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  });
}

export const placeQueries = {
  search: (query: string, language: Language) =>
    queryOptions({
      queryKey: ['places', language, query],
      queryFn: () => searchPlaces(query, language),
      enabled: query.length >= 2,
      staleTime: Number.POSITIVE_INFINITY,
    }),
};
