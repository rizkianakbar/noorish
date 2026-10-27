import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';
import { AppShell } from '#/components/app-shell.tsx';
import { IOS_SPLASH_SCREENS, SPLASH_CSS, SPLASH_STAR } from '#/features/pwa/pwa.constants.ts';
import { arabicFontFiles, criticalFontFiles } from '#/lib/fonts.ts';
import { pageHead } from '#/lib/seo.ts';
import appCss from '#/styles.css?url';

export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Applies the saved theme before first paint so dark-mode readers don't get
 * a white flash while the app boots. Mirrors `useApplyPrefs` in app-shell.
 * It also preloads the reader's chosen Arabic font, which only the prefs know.
 */
const prefsScript = `try{var p=JSON.parse(localStorage.getItem('quran:prefs')||'{}'),t=p.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark'||t==='night');var f=${JSON.stringify(arabicFontFiles)}[p.arabicFont]||${JSON.stringify(arabicFontFiles.amiri)},l=document.createElement('link');l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin='';l.href=f;document.head.appendChild(l)}catch(e){}`;

/**
 * Fallbacks for the installed app's splash, which is pure CSS for its first
 * frame (see `pwa-splash.ts`): marks the app `standalone` where iOS doesn't
 * report the display mode, and measures the status bar (`--splash-shift`)
 * for screens without a launch-image rule. React hoists the stylesheet
 * above this script, so it runs only once that has loaded.
 */
const standaloneScript = `try{var r=document.documentElement,s=navigator.standalone;if(s||matchMedia('(display-mode: standalone)').matches)r.classList.add('standalone');if(s)r.style.setProperty('--splash-shift',Math.max(0,screen.height-innerHeight)+'px')}catch(e){}`;

export const Route = createRootRouteWithContext<RouterContext>()({
  // Child routes render on the client only, so their head() never reaches
  // the server HTML; the root builds every page's title and tags instead.
  head: ({ matches }) => {
    const page = pageHead(matches);
    return {
      meta: [
        // resizes-content: Android shrinks the page for the keyboard instead of covering it.
        // viewport-fit=cover: the page runs under iOS Safari's toolbar and the home indicator
        // instead of stopping above them; bottom-anchored UI pads itself with safe-area insets.
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
        },
        ...page.meta,
        { name: 'theme-color', content: '#1b2a4e' },
        // The name under the Home Screen icon on iOS.
        { name: 'apple-mobile-web-app-title', content: 'Noorish' },
        // Without this iOS ignores the launch images below and opens on a blank screen,
        // even though the manifest already makes the app standalone.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        // Fonts need `crossorigin` even same-origin, or the preload goes unused.
        ...criticalFontFiles.map((href) => ({
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          crossOrigin: 'anonymous' as const,
          href,
        })),
        // Google's results show a raster favicon only at a multiple of 48px; the .ico is for
        // browsers and crawlers that ask for it by name. Rendered by `bun pwa:splash`.
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // iOS launch screens, one per screen size; the same art as the in-app splash.
        ...IOS_SPLASH_SCREENS.map(({ file, media }) => ({ rel: 'apple-touch-startup-image', href: file, media })),
        ...page.links,
      ],
      scripts: [{ children: prefsScript }, ...page.scripts],
    };
  },
  shellComponent: RootDocument,
  component: RootComponent,
});

/**
 * The HTML document. Always server-rendered, even though route components
 * render on the client (see `defaultSsr` in `src/start.ts`).
 */
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Kept first: the charset must come within the first 1 KB. */}
        <meta charSet="utf-8" />
        {/* Before the stylesheet in <HeadContent />, so the installed app's first frame is the splash. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static script from our own constant */}
        <script dangerouslySetInnerHTML={{ __html: standaloneScript }} />
        <style>{SPLASH_CSS}</style>
        <HeadContent />
      </head>
      {/* Extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before hydration. */}
      <body className="bg-background antialiased" suppressHydrationWarning>
        {/* First frame of the installed app (see `pwa-splash.ts`); faded out by the app shell. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static markup from our own constant */}
        <div id="splash" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPLASH_STAR }} />
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
              { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
