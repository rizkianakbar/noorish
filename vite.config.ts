import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import { pwa } from './src/features/pwa/pwa.plugin.ts';

export default defineConfig({
  clearScreen: false,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Nitro picks the `vercel` preset automatically when building on Vercel.
    nitro({
      rolldownConfig: {
        // TanStack Router ships "use client" for RSC bundlers; harmless in the
        // server bundle, but Nitro's build warns once per module.
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        },
      },
    }),
    tailwindcss(),
    tanstackStart({
      // Every surah page as static HTML with its opening verses (see the surah
      // route), served from the CDN: the text paints before any script runs and
      // crawlers read it. Nothing else is server-rendered.
      pages: Array.from({ length: 114 }, (_, i) => ({ path: `/surah/${i + 1}` })),
      prerender: { enabled: true, crawlLinks: false, autoStaticPathsDiscovery: false, failOnError: true },
    }),
    react(),
    pwa(),
  ],
});
