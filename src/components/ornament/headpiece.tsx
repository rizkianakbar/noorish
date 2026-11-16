import { useId } from 'react';
import { cn } from '#/lib/utils.ts';
import { rosetteFor, starOutline } from './geometry.ts';
import { Rosette } from './rosette.tsx';

const W = 1000;
const H = 240;
const CY = H / 2;

/**
 * Cartouche: a long lozenge with pointed ends, the frame that holds the
 * surah's name in mushaf headpieces.
 */
function cartouchePath(x: number, y: number, w: number, h: number): string {
  const tip = h * 0.55;
  const r = h / 2;
  return [
    `M${x} ${y + r}`,
    `L${x + tip} ${y}`,
    `L${x + w - tip} ${y}`,
    `L${x + w} ${y + r}`,
    `L${x + w - tip} ${y + h}`,
    `L${x + tip} ${y + h}`,
    'Z',
  ].join(' ');
}

/**
 * The illuminated headpiece (sarlawḥ) that opens a surah: a lattice of
 * eight-point stars, a rosette at each end, and the name in Kufic at the
 * centre. The geometry varies by surah number.
 */
export function Headpiece({
  surah,
  title,
  subtitle,
  className,
}: {
  surah: number;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const spec = rosetteFor(surah);
  const cart = { x: 230, y: CY - 62, w: 540, h: 124 };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={subtitle ? `${title}, ${subtitle}` : title}
      className={cn('headpiece block h-auto w-full', className)}>
      <defs>
        <pattern id={`lattice-${id}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d={starOutline({ cx: 20, cy: 20, r: 13, inner: 8.5, n: 8, rotation: Math.PI / 8 })}
            className="fill-none stroke-(--gold)/65"
            strokeWidth={0.8}
          />
          <circle cx="0" cy="0" r="2" className="fill-(--gold)/50" />
          <circle cx="40" cy="0" r="2" className="fill-(--gold)/50" />
          <circle cx="0" cy="40" r="2" className="fill-(--gold)/50" />
          <circle cx="40" cy="40" r="2" className="fill-(--gold)/50" />
        </pattern>
        <clipPath id={`frame-${id}`}>
          <rect x="14" y="14" width={W - 28} height={H - 28} rx="10" />
        </clipPath>
      </defs>

      <rect x="14" y="14" width={W - 28} height={H - 28} rx="10" className="fill-(--ornament-ground)" />
      <rect
        x="14"
        y="14"
        width={W - 28}
        height={H - 28}
        rx="10"
        fill={`url(#lattice-${id})`}
        clipPath={`url(#frame-${id})`}
        className="ornament-fill"
        style={{ animationDelay: '500ms' }}
      />
      <rect
        x="4"
        y="4"
        width={W - 8}
        height={H - 8}
        rx="16"
        pathLength={1}
        className="draw fill-none stroke-gold"
        strokeWidth={1.5}
      />
      <rect
        x="14"
        y="14"
        width={W - 28}
        height={H - 28}
        rx="10"
        pathLength={1}
        className="draw fill-none stroke-gold"
        strokeWidth={0.75}
        style={{ animationDelay: '120ms' }}
      />

      <Rosette cx={118} cy={CY} r={92} spec={spec} delay={200} />
      <Rosette cx={W - 118} cy={CY} r={92} spec={spec} delay={260} />

      <path d={cartouchePath(cart.x, cart.y, cart.w, cart.h)} className="fill-(--ornament-field)" />
      <path
        d={cartouchePath(cart.x, cart.y, cart.w, cart.h)}
        pathLength={1}
        className="draw fill-none stroke-gold"
        strokeWidth={1.6}
        strokeLinejoin="round"
        style={{ animationDelay: '320ms' }}
      />
      <path
        d={cartouchePath(cart.x + 9, cart.y + 9, cart.w - 18, cart.h - 18)}
        pathLength={1}
        className="draw fill-none stroke-gold/60"
        strokeWidth={0.8}
        strokeLinejoin="round"
        style={{ animationDelay: '420ms' }}
      />

      <text
        x={W / 2}
        y={subtitle ? CY + 6 : CY + 14}
        textAnchor="middle"
        direction="rtl"
        className="ornament-fill fill-gold font-kufi"
        style={{ fontSize: 62, animationDelay: '650ms' }}>
        {title}
      </text>
      {subtitle && (
        <text
          x={W / 2}
          y={CY + 42}
          textAnchor="middle"
          className="ornament-fill fill-gold/80 font-serif"
          style={{ fontSize: 17, letterSpacing: '0.04em', animationDelay: '800ms' }}>
          {subtitle}
        </text>
      )}
    </svg>
  );
}

/**
 * The eight-point star that closes each verse, with its number inside.
 */
export function VerseMarker({ n, className }: { n: string; className?: string }) {
  return (
    <span className={cn('relative mx-1 inline-flex size-[1.15em] items-center justify-center align-middle', className)}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 20, cy: 20, r: 19, inner: 14.5, n: 8 })}
          className="fill-gold/12 stroke-gold"
          strokeWidth={1.3}
        />
        <circle cx="20" cy="20" r="11" className="fill-none stroke-gold/60" strokeWidth={0.8} />
      </svg>
      {/* Reem Kufi (preloaded, weight 500 only): its digits sit centred in their line box, where the
          Quran faces' tall ascents drop them well below the star's middle (Amiri Quran by over a third of an em). */}
      <span className="relative font-kufi text-[0.5em] leading-none font-medium text-gold-ink">{n}</span>
    </span>
  );
}
