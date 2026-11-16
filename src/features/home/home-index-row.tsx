import { Link } from '@tanstack/react-router';
import { starOutline } from '#/components/ornament/geometry.ts';
import { chapterTranslatedName, useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { getSurah } from '#/lib/quran/data.ts';
import type { Chapter } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';

function IndexMarker({ n, done }: { n: number; done: boolean }) {
  return (
    <span className="relative inline-flex size-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 20, cy: 20, r: 19, inner: 15, n: 8 })}
          className={cn('stroke-gold', done ? 'fill-gold/25' : 'fill-none')}
          strokeWidth={1}
        />
      </svg>
      <span className="relative text-xs font-medium tabular-nums">{n}</span>
    </span>
  );
}

export function HomeIndexRow({ chapter, read }: { chapter: Chapter; read: number }) {
  const t = useT();
  const { language } = usePrefs();
  const pct = read / chapter.versesCount;

  return (
    <li>
      <Link
        to="/surah/$surah"
        params={{ surah: chapter.number }}
        onMouseEnter={() => void getSurah(chapter.number)}
        className="group flex items-center gap-4 border-b py-3 transition-colors hover:border-gold/50">
        <IndexMarker n={chapter.number} done={pct >= 1} />
        <span className="min-w-0 grow">
          <span className="block truncate font-serif text-[1.0625rem] group-hover:text-gold-ink">
            {chapter.nameSimple}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {chapterTranslatedName(chapter, language)}
            <span className="ml-2">
              {read > 0 && pct < 1 ? t.versesRead(read, chapter.versesCount) : t.verses(chapter.versesCount)}
            </span>
            <span className="ml-2">{t[chapter.revelationPlace]}</span>
          </span>
        </span>
        {read > 0 && pct < 1 && (
          <span
            className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border"
            title={`${read}/${chapter.versesCount}`}>
            <span className="block h-full bg-gold" style={{ width: `${pct * 100}%` }} />
          </span>
        )}
        <span dir="rtl" lang="ar" className="w-24 shrink-0 text-right font-kufi text-xl text-gold-ink">
          {chapter.nameArabic}
        </span>
      </Link>
    </li>
  );
}
