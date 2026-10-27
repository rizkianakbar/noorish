import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '#/components/ui/input.tsx';
import { useT } from '#/lib/i18n.ts';
import { dockStore, resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import { useChapters } from '#/lib/quran/data.ts';
import { searchIndexStore, searchQueries, warmSearch } from './search.api.ts';
import { normalizeLatin, parseQuery } from './search.lib.ts';
import { DuaResults, HadithResults, useDuaHadithSearch } from './search-duas-hadith.tsx';

function highlight(text: string, query: string) {
  const at = normalizeLatin(text).indexOf(normalizeLatin(query));
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-highlight px-0.5 text-highlight-foreground">
        {text.slice(at, at + query.length)}
      </mark>
      {text.slice(at + query.length)}
    </>
  );
}

function QuranHeading() {
  const t = useT();
  return (
    <h3 className="sticky top-0 z-10 flex items-center gap-2 border-b bg-popover/95 px-5 py-2 text-xs font-medium tracking-[0.14em] text-gold-ink uppercase backdrop-blur [&_svg]:size-3.5">
      <BookOpen />
      {t.quran}
    </h3>
  );
}

export function SearchPanel() {
  const t = useT();
  const prefs = usePrefs();
  const lang = resolveTranslation(prefs) ?? prefs.language;
  const { data: chapters = [] } = useChapters();
  const { loaded, ready } = searchIndexStore.use();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    // Re-focus when ⌘K is pressed while the panel is already open.
    return dockStore.subscribe(() => {
      if (dockStore.get() === 'search') inputRef.current?.focus();
    });
  }, []);

  useEffect(warmSearch, []);

  const search = useQuery(searchQueries.verses(deferred, lang));
  const found = deferred.length >= 3 ? search.data : undefined;
  const results = found?.hits ?? [];
  // Duas and hadith search from two letters ("doa" alone browses the categories).
  const parsed = useMemo(() => parseQuery(deferred), [deferred]);
  const extra = useDuaHadithSearch(parsed, deferred.length >= 2);
  const extraCount = extra.duas.length + extra.hadith.texts.length + extra.hadith.books.length;

  return (
    <div className="flex min-h-0 grow flex-col">
      <div className="space-y-2 border-b px-5 py-3">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {!ready
            ? t.searchLoading(Math.round((loaded / 114) * 100))
            : deferred.length > 0 && deferred.length < 3
              ? t.searchMinChars
              : deferred.length >= 3
                ? t.searchResults(results.length + extraCount)
                : t.searchHint}
        </p>
      </div>
      <div className="min-h-0 grow overflow-y-auto">
        {/* What the query asks for comes first: "doa …" leads with duas, "hadis …" with hadith. */}
        {parsed.intent === 'dua' && <DuaResults results={extra} />}
        {parsed.intent === 'hadith' && <HadithResults results={extra} />}
        {results.length > 0 && (
          <section>
            {(extra.duas.length > 0 || extra.hadith.texts.length > 0 || extra.hadith.books.length > 0) && (
              <QuranHeading />
            )}
            <ol className="md:columns-2 md:gap-0">
              {results.map((r) => (
                <li key={`${r.surah}:${r.verse}`} className="break-inside-avoid border-b">
                  <Link
                    to="/surah/$surah"
                    params={{ surah: r.surah }}
                    hash={`v${r.verse}`}
                    className="block px-5 py-3 text-sm transition-colors hover:bg-muted">
                    <span className="text-xs font-medium text-muted-foreground">
                      {chapters[r.surah - 1]?.nameSimple}{' '}
                      <span className="ml-1 text-gold-ink tabular-nums">
                        {r.surah}:{r.verse}
                      </span>
                    </span>
                    {r.viaLatin ? (
                      <span
                        lang="ar-Latn"
                        className="mt-1 line-clamp-3 block font-serif leading-snug text-gold-ink italic">
                        {r.text}
                      </span>
                    ) : (
                      <span className="mt-1 line-clamp-3 block leading-snug">
                        {highlight(r.text, found?.query ?? deferred)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
        {parsed.intent !== 'dua' && <DuaResults results={extra} />}
        {parsed.intent !== 'hadith' && <HadithResults results={extra} />}
      </div>
    </div>
  );
}
