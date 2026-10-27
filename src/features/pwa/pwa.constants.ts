/**
 * iOS shows a launch image only when one matches the screen exactly (CSS
 * size and pixel ratio, portrait). Without one the installed app opens on
 * a blank screen. Rendered by `bun pwa:splash`; linked from the root head.
 */
const SCREENS: [width: number, height: number, scale: number][] = [
  [440, 956, 3], // iPhone 16/17 Pro Max
  [420, 912, 3], // iPhone Air
  [402, 874, 3], // iPhone 16/17 Pro, 17
  [430, 932, 3], // iPhone 14/15 Pro Max, 15/16 Plus
  [393, 852, 3], // iPhone 14/15 Pro, 15, 16
  [428, 926, 3], // iPhone 12/13 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12, 13, 14, 12/13 Pro
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12/13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [414, 736, 3], // iPhone 6–8 Plus
  [375, 667, 2], // iPhone 6–8, SE (2nd, 3rd)
  [1032, 1376, 2], // iPad Pro 13" (M4)
  [1024, 1366, 2], // iPad Pro 12.9", iPad Air 13"
  [834, 1210, 2], // iPad Pro 11" (M4)
  [834, 1194, 2], // iPad Pro 11"
  [820, 1180, 2], // iPad Air
  [744, 1133, 2], // iPad mini (6th, 7th)
  [768, 1024, 2], // older iPads
];

export const IOS_SPLASH_SCREENS = SCREENS.map(([width, height, scale]) => ({
  width,
  height,
  scale,
  // PNG: the format Apple documents for launch images (iOS ignored JPEGs).
  file: `/splash/ios-${width}x${height}@${scale}x.png`,
  media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: portrait)`,
}));

/**
 * The installed app's splash: the lapis ground and the star from the icon.
 * The same markup draws the in-app splash (in the document shell, so it is
 * the first frame painted) and the iOS launch images (`bun pwa:splash`), so
 * the hand-off from the system's launch screen to the page can't be seen.
 */

export const SPLASH_STAR = `<svg viewBox="0 0 64 64" width="112" height="112" aria-hidden="true"><path d="M32 1 36.97 6.99 43.86 3.36 46.17 10.8 53.92 10.08 53.2 17.83 60.64 20.14 57.01 27.03 63 32 57.01 36.97 60.64 43.86 53.2 46.17 53.92 53.92 46.17 53.2 43.86 60.64 36.97 57.01 32 63 27.03 57.01 20.14 60.64 17.83 53.2 10.08 53.92 10.8 46.17 3.36 43.86 6.99 36.97 1 32 6.99 27.03 3.36 20.14 10.8 17.83 10.08 10.08 17.83 10.8 20.14 3.36 27.03 6.99Z" fill="#1b2a4e" stroke="#d4a94a" stroke-width="2.4" stroke-linejoin="round"/><path d="M38.51 16.29 40.13 23.87 47.71 25.49 43.5 32 47.71 38.51 40.13 40.13 38.51 47.71 32 43.5 25.49 47.71 23.87 40.13 16.29 38.51 20.5 32 16.29 25.49 23.87 23.87 25.49 16.29 32 20.5Z" fill="#d4a94a"/><circle cx="32" cy="32" r="4" fill="#1b2a4e"/></svg>`;

/**
 * Hidden in a browser tab, where the page itself is the first thing seen;
 * shown in the installed app: `display-mode: standalone`, or the
 * `standalone` class the theme script in `__root.tsx` sets from Safari's
 * `navigator.standalone` (iOS doesn't always report the display mode).
 * A flat ground, not a gradient: iOS launch images must be PNG, and a
 * gradient makes each one ~1 MB. Positioning on iOS: see SCREEN_RULES;
 * other screens fall back to `--splash-shift`, the status bar height the
 * script in `__root.tsx` measures (later, but they have no launch image to
 * match). Until the
 * splash leaves, the page ground is lapis too, so no frame painted before
 * it can be white; the theme's own ground takes over under the opaque
 * splash as the fade begins. Leaving: the
 * ground fades while the star drifts larger and fades a little sooner, like
 * a native launch, then the whole layer stops hit-testing and painting.
 */
/**
 * Per screen with a launch image: the splash anchored to the bottom of the
 * page with the full screen's height. iOS starts the page below the status
 * bar but the launch image fills the screen, so this puts the star at the
 * screen's centre, exactly where the launch image has it. CSS, not script:
 * React hoists the stylesheet to the top of <head>, so no script can run
 * before the first paint, and the first frame must already be right.
 */
const SCREEN_RULES = IOS_SPLASH_SCREENS.map(
  ({ media, height }) => `@media ${media}{#splash{top:auto;height:${height}px}}`,
).join('');

export const SPLASH_CSS = `
#splash{position:fixed;inset:0;top:calc(-1*var(--splash-shift,0px));z-index:100;display:none;place-items:center;background:#1b2a4e}
#splash svg{filter:drop-shadow(0 0 28px rgb(212 169 74/.28))}
${SCREEN_RULES}
@media (display-mode:standalone){#splash{display:grid}html:has(#splash:not([data-state=out])),html:has(#splash:not([data-state=out])) body{background-color:#1b2a4e}}
.standalone #splash{display:grid}
.standalone:has(#splash:not([data-state=out])),.standalone:has(#splash:not([data-state=out])) body{background-color:#1b2a4e}
#splash[data-state=out]{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .42s cubic-bezier(.4,0,.2,1),visibility 0s linear .42s}
#splash[data-state=out] svg{transform:scale(1.12);opacity:0;transition:transform .42s cubic-bezier(.2,0,0,1),opacity .3s cubic-bezier(.4,0,1,1)}
@media (prefers-reduced-motion:reduce){#splash[data-state=out],#splash[data-state=out] svg{transition-duration:.15s;transform:none}}
`;
