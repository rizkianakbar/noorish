import { createFileRoute, notFound } from '@tanstack/react-router';
import { ReaderLoadError, ReaderNotFound } from '#/features/reader/reader-fallbacks.tsx';
import { ReaderPage } from '#/features/reader/reader-page.tsx';
import { loadReaderFonts } from '#/lib/fonts.ts';
import { prefsStore } from '#/lib/prefs.ts';
import { chaptersQuery, getSurah, isValidSurah } from '#/lib/quran/data.ts';
import { getSurahPreviewFn } from '#/server/quran.functions.ts';

export const Route = createFileRoute('/surah/$surah')({
  params: {
    parse: ({ surah }) => {
      const n = Number(surah);
      if (!isValidSurah(n)) throw notFound();
      return { surah: n };
    },
    stringify: ({ surah }) => ({ surah: String(surah) }),
  },
  // Server-rendered (and prerendered at build, see vite.config.ts) with the
  // opening verses, so they paint with the HTML, before any script runs.
  ssr: true,
  // Wait only for the small chapter list (the header needs it). In the browser
  // the surah and the fonts are just started here, as early as a hover
  // preload; the page fades in when they land, so navigating never blocks on a
  // large JSON file. On the server, the page gets the opening verses instead.
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(chaptersQuery);
    if (typeof window === 'undefined') return { preview: await getSurahPreviewFn({ data: { surah: params.surah } }) };
    void getSurah(params.surah).catch(() => {});
    void loadReaderFonts(prefsStore.get().arabicFont);
    return { preview: null };
  },
  errorComponent: ReaderLoadError,
  notFoundComponent: ReaderNotFound,
  component: SurahRoute,
});

function SurahRoute() {
  const { surah } = Route.useParams();
  const { preview } = Route.useLoaderData();
  return <ReaderPage surah={surah} preview={preview} />;
}
