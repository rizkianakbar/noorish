import { Compass } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { useCompass } from './prayer.hooks.ts';
import { compassPoint, kaabaDistanceKm, qiblaBearing, turnBetween } from './prayer.lib.ts';
import type { Place } from './prayer.types.ts';
import { PrayerPageShell } from './prayer-page-shell.tsx';

/**
 * Within this many degrees of the qibla counts as facing it.
 */
const ALIGNED_DEG = 5;
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const CARDINALS = [
  { label: 'N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

function polar(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: 150 + r * Math.cos(rad), y: 150 + r * Math.sin(rad) };
}

type QiblaDialProps = { bearing: number; heading: number | null; aligned: boolean };

/**
 * A compass rose with the Kaaba on its rim. With a heading the rose turns so
 * its N is true north and the mark at the top is where the phone points;
 * without one it sits still, N up.
 */
function QiblaDial(props: QiblaDialProps) {
  const { bearing, heading, aligned } = props;
  const kaaba = polar(bearing, 104);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-80">
      <svg viewBox="0 0 300 300" className="size-full" aria-hidden="true">
        {heading !== null && (
          <path
            d="M150 6 L158 22 L142 22 Z"
            className={cn('transition-colors', aligned ? 'fill-gold' : 'fill-muted-foreground')}
          />
        )}
        <g
          className="origin-center transition-transform duration-200 ease-out"
          style={{ transform: `rotate(${-(heading ?? 0)}deg)`, transformBox: 'view-box' }}>
          <circle cx="150" cy="150" r="124" className="fill-card stroke-gold/40" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="88" className="fill-none stroke-border" />
          {TICKS.map((deg) => {
            const major = deg % 45 === 0;
            const a = polar(deg, 124);
            const b = polar(deg, major ? 112 : 118);
            return (
              <line
                key={deg}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={major ? 'stroke-gold-ink' : 'stroke-muted-foreground/40'}
                strokeWidth={major ? 1.5 : 1}
              />
            );
          })}
          {CARDINALS.map(({ label, deg }) => {
            const p = polar(deg, 98);
            return (
              <text
                key={label}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${deg} ${p.x} ${p.y})`}
                className={cn('text-[13px] font-medium', deg === 0 ? 'fill-gold-ink' : 'fill-muted-foreground')}>
                {label}
              </text>
            );
          })}
          {/* The needle to the Kaaba, and the Kaaba on the rim. */}
          <line
            x1="150"
            y1="150"
            x2={kaaba.x}
            y2={kaaba.y}
            className="stroke-gold"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="150" cy="150" r="5" className="fill-gold" />
          <g transform={`translate(${kaaba.x} ${kaaba.y}) rotate(${bearing})`}>
            <rect x="-9" y="-9" width="18" height="18" rx="1.5" className="fill-lapis stroke-gold" strokeWidth="1.5" />
            <rect x="-9" y="-4.5" width="18" height="3" className="fill-gold" />
          </g>
        </g>
      </svg>
    </div>
  );
}

type QiblaProps = { place: Place };

function Qibla(props: QiblaProps) {
  const { place } = props;
  const t = useT();
  const { language } = usePrefs();
  const compass = useCompass();
  const bearing = qiblaBearing(place);
  const heading = compass.status === 'active' ? compass.heading : null;
  const aligned = heading !== null && Math.abs(turnBetween(heading, bearing)) <= ALIGNED_DEG;
  const km = new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(kaabaDistanceKm(place));

  // A short buzz on turning to face it, where the device can.
  useEffect(() => {
    if (aligned) navigator.vibrate?.(40);
  }, [aligned]);

  return (
    <div className="space-y-6 text-center">
      <div>
        <p className="font-serif text-5xl tabular-nums">{Math.round(bearing)}°</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.qiblaFromNorth(Math.round(bearing), compassPoint(bearing))}
        </p>
        <p className="text-sm text-muted-foreground">{t.kaabaDistance(km)}</p>
      </div>

      <QiblaDial bearing={bearing} heading={heading} aligned={aligned} />

      <div className="mx-auto max-w-sm text-sm" aria-live="polite">
        {compass.status === 'needs-permission' && (
          <Button size="lg" onClick={compass.enable}>
            <Compass data-icon="inline-start" />
            {t.enableCompass}
          </Button>
        )}
        {compass.status === 'active' && (
          <p className={aligned ? 'font-medium text-gold-ink' : 'text-muted-foreground'}>
            {aligned ? t.compassAligned : t.compassHint}
          </p>
        )}
        {compass.status === 'unsupported' && <p className="text-muted-foreground">{t.compassUnsupported}</p>}
        {compass.status === 'denied' && <p className="text-muted-foreground">{t.compassDenied}</p>}
      </div>
    </div>
  );
}

export function PrayerQiblaPage() {
  const t = useT();
  return <PrayerPageShell title={t.qibla}>{(place) => <Qibla place={place} />}</PrayerPageShell>;
}
