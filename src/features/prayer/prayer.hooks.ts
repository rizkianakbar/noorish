import { useCallback, useEffect, useMemo, useState } from 'react';
import { methodFor, prayerDay, turnBetween } from './prayer.lib.ts';
import { prayerStore } from './prayer.store.ts';

/**
 * The current time, refreshed on the boundary of every `stepMs` (a minute by
 * default), so a countdown ticks over together with the clock.
 */
function useNow(stepMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, stepMs - (Date.now() % stepMs));
    };
    timer = setTimeout(tick, stepMs - (Date.now() % stepMs));
    // Timers stall in background tabs; catch up when the page is shown again.
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [stepMs]);

  return now;
}

/**
 * Today's prayer times for the chosen place, or null before one is chosen.
 */
export function usePrayerDay(stepMs?: number) {
  const settings = prayerStore.use();
  const now = useNow(stepMs);
  const { place } = settings;
  const day = useMemo(() => (place ? prayerDay(place, settings, now) : null), [place, settings, now]);
  return { settings, place, day, now, method: place ? methodFor(settings, place) : null };
}

type CompassStatus = 'checking' | 'needs-permission' | 'active' | 'unsupported' | 'denied';

interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

type PermissionedOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/**
 * No reading within this long means there is no compass (most laptops
 * support the event but never fire it).
 */
const NO_SENSOR_MS = 1500;

/**
 * The device's compass heading, in degrees clockwise from north, for
 * rotating a dial. Kept continuous (359° then 361°, not 1°), so a CSS
 * transition turns the short way. iOS asks permission first: call `enable`
 * from a tap.
 */
export function useCompass() {
  const [status, setStatus] = useState<CompassStatus>('checking');
  const [heading, setHeading] = useState<number | null>(null);
  const [granted, setGranted] = useState(false);

  const needsPermission =
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as PermissionedOrientation).requestPermission === 'function';

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') return setStatus('unsupported');
    if (needsPermission && !granted) return setStatus('needs-permission');

    let frame = 0;
    let latest: number | null = null;
    const commit = () => {
      frame = 0;
      if (latest === null) return;
      const next = latest;
      setHeading((prev) => (prev === null ? next : prev + turnBetween(prev, next)));
      setStatus('active');
    };
    const read = (raw: number) => {
      // The sensor reports the top of the device; a turned screen points elsewhere.
      latest = (raw + (screen.orientation?.angle ?? 0) + 360) % 360;
      if (!frame) frame = requestAnimationFrame(commit);
    };
    const onAbsolute = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) read(360 - event.alpha);
    };
    const onRelative = (event: OrientationEventWithCompass) => {
      if (event.webkitCompassHeading !== undefined) read(event.webkitCompassHeading);
    };

    window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener);
    window.addEventListener('deviceorientation', onRelative);
    const noSensor = setTimeout(() => latest === null && setStatus('unsupported'), NO_SENSOR_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(noSensor);
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener);
      window.removeEventListener('deviceorientation', onRelative);
    };
  }, [needsPermission, granted]);

  const enable = useCallback(async () => {
    const request = (DeviceOrientationEvent as PermissionedOrientation).requestPermission;
    const result = await request?.().catch(() => 'denied' as const);
    if (result === 'granted') setGranted(true);
    else setStatus('denied');
  }, []);

  return { status, heading, enable };
}
