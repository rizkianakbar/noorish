import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { starOutline } from '#/components/ornament/geometry.ts';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { PageShell } from '#/components/page-shell.tsx';
import { TextSizeButtons } from '#/components/text-size-buttons.tsx';
import { Input } from '#/components/ui/input.tsx';
import { dayNumber } from '#/features/home/home.lib.ts';
import { matchesAll, parseQuery } from '#/features/search/search.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { hadithQueries } from './hadith.api.ts';
import { ARABIC_COLLECTION_NAMES, expandTopic, filterHadiths, searchHadith, splitNarrator } from './hadith.lib.ts';
import { hadithLastStore } from './hadith.store.ts';
import type { HadithCollection } from './hadith.types.ts';
import { HadithCard } from './hadith-card.tsx';

/**
 * The two forties, short enough to search in full on the device.
 */
const FORTIES = ['nawawi', 'qudsi'];

const sectionTitle = 'mb-3 px-1 text-xs font-medium tracking-[0.16em] text-gold-ink uppercase';
const darkPanel =
  'dark relative overflow-hidden rounded-[1.75rem] bg-(--ornament-field) text-foreground ring-1 ring-gold/30';

type ShellProps = { title: string; children: React.ReactNode };

function Shell(props: ShellProps) {
  const { title, children } = props;
  const t = useT();
  return (
    <PageShell title={title}>
      <div className="mt-5">{children}</div>
      <p className="mt-10 text-center text-xs text-muted-foreground">{t.hadithCredit}</p>
    </PageShell>
  );
}

function useCollectionName() {
  const t = useT();
  return (collection: Pick<HadithCollection, 'slug' | 'name'>) =>
    t.hadithCollections[collection.slug as keyof typeof t.hadithCollections] ?? collection.name;
}

/**
 * The reader's translation language for hadith (the source has English and
 * Indonesian), following their Quran translation, else the interface.
 */
function useHadithLanguage(): 'en' | 'id' {
  const prefs = usePrefs();
  return resolveTranslation(prefs) ?? prefs.language;
}

type SearchFieldProps = { value: string; onChange: (value: string) => void; label: string };

function SearchField(props: SearchFieldProps) {
  const { value, onChange, label } = props;
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="h-11 rounded-full pl-10 text-base sm:text-sm"
      />
    </div>
  );
}

type BookStarProps = { n: number };

function BookStar(props: BookStarProps) {
  return (
    <span className="relative inline-flex size-9 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={starOutline({ cx: 20, cy: 20, r: 19, inner: 15, n: 8 })}
          className="fill-none stroke-gold/70"
          strokeWidth={1}
        />
      </svg>
      <span className="relative text-[0.6875rem] font-medium tabular-nums">{props.n}</span>
    </span>
  );
}

/**
 * The book read last, to pick up from: on the hadith home, and on its own
 * collection's page.
 */
function ContinueReading(props: { collection?: string }) {
  const t = useT();
  const name = useCollectionName();
  const last = hadithLastStore.use();
  if (!last || (props.collection && last.collection !== props.collection)) return null;
  return (
    <Link
      to="/hadith/$collection/$book"
      params={{ collection: last.collection, book: String(last.book) }}
      className="pressable flex items-center gap-4 rounded-2xl bg-gold/8 px-5 py-4 ring-1 ring-gold/40 hover:bg-gold/12">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-4">
        <BookOpen />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-xs text-gold-ink">{t.continueReading}</span>
        <span className="block truncate font-serif text-lg">{last.name}</span>
        {!props.collection && (
          <span className="block truncate text-xs text-muted-foreground">
            {name({ slug: last.collection, name: last.collection })}
          </span>
        )}
      </span>
      <ArrowRight className="size-4 shrink-0 text-gold-ink" />
    </Link>
  );
}

/**
 * One of an-Nawawi's Forty each day, as a short epigraph: the opening of the
 * hadith with a way to read it whole in its place.
 */
function HadithOfTheDay() {
  const t = useT();
  const name = useCollectionName();
  const lang = useHadithLanguage();
  const { data } = useQuery(hadithQueries.book('nawawi', 1, lang));
  const hadiths = data?.hadiths ?? [];
  if (!hadiths.length) return null;
  const hadith = hadiths[dayNumber(new Date()) % hadiths.length];
  const text = hadith.translation ? splitNarrator(hadith.translation).body : null;

  return (
    <section aria-labelledby="hadith-of-day" className={cn(darkPanel, 'px-6 py-7 sm:px-8 sm:py-9')}>
      <Lattice className="opacity-40" />
      <div className="relative">
        <h2 id="hadith-of-day" className="text-xs font-medium tracking-[0.18em] text-gold uppercase">
          {t.hadithOfDay}
        </h2>
        {text ? (
          <p className="mt-4 line-clamp-6 font-serif text-lg leading-[1.75] text-foreground/90 sm:text-xl">{text}</p>
        ) : (
          hadith.arabic && (
            <p dir="rtl" lang="ar" className="mt-4 line-clamp-4 font-arabic text-2xl leading-[2.1]">
              {hadith.arabic}
            </p>
          )
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs tracking-[0.1em] text-muted-foreground uppercase tabular-nums">
            {name({ slug: 'nawawi', name: '' })} {Math.floor(hadith.number)}
          </span>
          <Link
            to="/hadith/$collection/$book"
            params={{ collection: 'nawawi', book: '1' }}
            hash={`h${hadith.number}`}
            className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-medium text-lapis hover:bg-gold/85 [&_svg]:size-4">
            {t.hadithReadFull}
            <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * `/hadith`: the hadith of the day, where you left off, one search (the
 * forties' text and every collection's book titles), then the collections:
 * the two forties first, where most people start, then the major ones.
 */
export function HadithHome() {
  const t = useT();
  const name = useCollectionName();
  const lang = useHadithLanguage();
  const { data, isError } = useQuery(hadithQueries.index());
  const featured = data?.collections.filter((c) => c.featured) ?? [];
  const library = data?.collections.filter((c) => !c.featured) ?? [];
  const [filter, setFilter] = useState('');
  const query = parseQuery(filter);
  const searching = query.terms.length > 0 || !!query.arabic;
  const forties = useQueries({
    queries: (searching ? FORTIES : []).map((slug) => hadithQueries.book(slug, 1, lang)),
  });
  const results = searching
    ? searchHadith(
        FORTIES.flatMap((slug, i) => {
          const collection = data?.collections.find((c) => c.slug === slug);
          return collection ? (forties[i]?.data?.hadiths ?? []).map((hadith) => ({ collection, hadith })) : [];
        }),
        data?.collections ?? [],
        query,
        12,
      )
    : null;

  return (
    <Shell title={t.hadith}>
      {isError && <p className="mb-4 text-sm text-destructive">{t.hadithLoadError}</p>}
      <HadithOfTheDay />
      <div className="mt-5 space-y-4">
        <ContinueReading />
        <SearchField value={filter} onChange={setFilter} label={t.hadithSearchAll} />
      </div>

      {results ? (
        <div className="mt-6 space-y-6">
          {results.texts.length === 0 && results.books.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">{t.hadithNoMatch}</p>
          )}
          {results.texts.length > 0 && (
            <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              {results.texts.map(({ collection, hadith }) => (
                <li key={`${collection.slug}-${hadith.number}`}>
                  <Link
                    to="/hadith/$collection/$book"
                    params={{ collection: collection.slug, book: '1' }}
                    hash={`h${hadith.number}`}
                    className="block px-5 py-3.5 transition-colors hover:bg-muted/60">
                    <span className="block text-xs text-gold-ink tabular-nums">
                      {name(collection)} {Math.floor(hadith.number)}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block font-serif text-[0.9375rem] leading-relaxed">
                      {hadith.translation && splitNarrator(hadith.translation).body}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {results.books.length > 0 && (
            <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              {results.books.map(({ collection, book }) => (
                <li key={`${collection.slug}-${book.number}`}>
                  <Link
                    to="/hadith/$collection/$book"
                    params={{ collection: collection.slug, book: String(book.number) }}
                    className="flex min-h-14 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60">
                    <span className="min-w-0 grow">
                      <span className="block leading-snug">{book.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {name(collection)} · {t.hadithBookShort(book.number)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <section aria-labelledby="hadith-start" className="mt-9">
            <h2 id="hadith-start" className={sectionTitle}>
              {t.hadithStartHere}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {featured.map((c) => (
                <Link
                  key={c.slug}
                  to="/hadith/$collection"
                  params={{ collection: c.slug }}
                  className="pressable flex flex-col rounded-2xl bg-card px-5 pt-5 pb-4 ring-1 ring-border hover:ring-gold/50">
                  <span dir="rtl" lang="ar" className="block text-right font-kufi text-2xl text-gold-ink">
                    {ARABIC_COLLECTION_NAMES[c.slug]}
                  </span>
                  <span className="mt-3 flex items-end justify-between gap-3">
                    <span>
                      <span className="block font-serif text-lg leading-tight">{name(c)}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{t.hadithCount(c.count)}</span>
                    </span>
                    <ArrowRight className="mb-0.5 size-4 shrink-0 text-gold-ink" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="hadith-library" className="mt-9">
            <h2 id="hadith-library" className={sectionTitle}>
              {t.hadithLibrary}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {library.map((c) => (
                <li key={c.slug}>
                  <Link
                    to="/hadith/$collection"
                    params={{ collection: c.slug }}
                    className="pressable flex h-full items-center gap-4 rounded-2xl bg-card px-5 py-4 ring-1 ring-border hover:ring-gold/50">
                    <span className="min-w-0 grow">
                      <span className="block font-serif text-lg leading-snug">{name(c)}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        {t.hadithCount(c.count)} · {t.hadithBooks(c.books.length)}
                      </span>
                    </span>
                    <span dir="rtl" lang="ar" className="shrink-0 font-kufi text-lg text-gold-ink">
                      {ARABIC_COLLECTION_NAMES[c.slug]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Shell>
  );
}

type HadithCollectionPageProps = { slug: string };

/**
 * A collection: its title, where you left off in it, and its books, findable
 * by topic. A single-book collection (the forties) goes straight to its hadith.
 */
export function HadithCollectionPage(props: HadithCollectionPageProps) {
  const { slug } = props;
  const t = useT();
  const name = useCollectionName();
  const { data, isError } = useQuery(hadithQueries.index());
  const collection = data?.collections.find((c) => c.slug === slug);
  const [filter, setFilter] = useState('');
  const terms = parseQuery(filter).terms;
  const books = collection?.books.filter((book) => !terms.length || matchesAll(book.name, terms, expandTopic)) ?? [];

  if (collection?.books.length === 1) {
    return (
      <Navigate
        to="/hadith/$collection/$book"
        params={{ collection: slug, book: String(collection.books[0].number) }}
        replace
      />
    );
  }

  return (
    <Shell title={collection ? name(collection) : t.hadith}>
      {(isError || (data && !collection)) && <p className="text-sm text-destructive">{t.hadithLoadError}</p>}
      {collection && (
        <>
          <section className={cn(darkPanel, 'px-6 py-6 sm:px-8')}>
            <Lattice className="opacity-40" />
            <div className="relative">
              <p dir="rtl" lang="ar" className="text-left font-kufi text-3xl text-gold sm:text-4xl">
                {ARABIC_COLLECTION_NAMES[slug]}
              </p>
              <p className="mt-3 text-sm text-muted-foreground tabular-nums">
                {t.hadithCount(collection.count)} · {t.hadithBooks(collection.books.length)}
              </p>
            </div>
          </section>
          <div className="mt-5 space-y-4">
            <ContinueReading collection={slug} />
            <SearchField value={filter} onChange={setFilter} label={t.filterBooks} />
          </div>
          {books.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">{t.noBookMatch}</p>}
          {books.length > 0 && (
            <ol className="mt-5 grid gap-x-3 gap-y-2 sm:grid-cols-2">
              {books.map((book) => (
                <li key={book.number}>
                  <Link
                    to="/hadith/$collection/$book"
                    params={{ collection: slug, book: String(book.number) }}
                    className="pressable flex h-full items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border hover:ring-gold/50">
                    <BookStar n={book.number} />
                    <span className="min-w-0 grow">
                      <span className="block leading-snug">{book.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                        {t.hadithRange(Math.floor(book.first), Math.floor(book.last))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Shell>
  );
}

type HadithBookPageProps = { slug: string; book: number };

/**
 * A book's hadith, loaded from the source's CDN when opened: where it sits in
 * its collection, a way to find one hadith by its words or number, the text
 * size, and the books either side at the end.
 */
export function HadithBookPage(props: HadithBookPageProps) {
  const { slug, book } = props;
  const t = useT();
  const name = useCollectionName();
  const lang = useHadithLanguage();
  const index = useQuery(hadithQueries.index());
  const collection = index.data?.collections.find((c) => c.slug === slug);
  const bookIndex = collection?.books.findIndex((b) => b.number === book) ?? -1;
  const info = collection?.books[bookIndex];
  const content = useQuery({ ...hadithQueries.book(slug, book, lang), enabled: !!info });
  const prev = collection?.books[bookIndex - 1];
  const next = collection?.books[bookIndex + 1];
  const single = collection?.books.length === 1;
  const collectionName = collection ? name(collection) : t.hadith;
  const hash = useLocation({ select: (l) => l.hash });
  const [filter, setFilter] = useState('');
  const query = parseQuery(filter);
  const shown = content.data ? filterHadiths(content.data.hadiths, query) : [];
  const title = single || !info ? collectionName : info.name;

  // Opened at a hadith (search, a copied link): bring it into view once the book has loaded.
  useEffect(() => {
    if (hash && content.data) document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [hash, content.data]);

  // Remembered for "Continue reading" once it has loaded.
  useEffect(() => {
    if (content.data && info) hadithLastStore.set({ collection: slug, book, name: title });
  }, [content.data, info, slug, book, title]);

  const bookLink = (target: typeof prev, direction: 'prev' | 'next') =>
    target && (
      <Link
        to="/hadith/$collection/$book"
        params={{ collection: slug, book: String(target.number) }}
        className={cn(
          'pressable flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border hover:ring-gold/50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gold-ink',
          direction === 'next' && 'justify-end text-right',
        )}>
        {direction === 'prev' && <ArrowLeft />}
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">{direction === 'prev' ? t.prevBook : t.nextBook}</span>
          <span className="block truncate text-sm">{target.name}</span>
        </span>
        {direction === 'next' && <ArrowRight />}
      </Link>
    );

  return (
    <Shell title={title}>
      {!single && collection && info && (
        <p className="-mt-2 mb-5 text-sm text-muted-foreground">
          <Link to="/hadith/$collection" params={{ collection: slug }} className="hover:text-gold-ink hover:underline">
            {collectionName}
          </Link>
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">{t.hadithBookOf(bookIndex + 1, collection.books.length)}</span>
        </p>
      )}
      {(index.isError || content.isError || (index.data && !info)) && (
        <p className="text-sm text-destructive">{t.hadithLoadError}</p>
      )}
      {content.isPending && info && <p className="text-sm text-muted-foreground">{t.hadithLoading}</p>}

      {content.data && (
        <>
          <div className="flex items-center gap-2">
            <div className="min-w-0 grow">
              <SearchField value={filter} onChange={setFilter} label={t.hadithFind} />
            </div>
            <TextSizeButtons />
          </div>
          <p className="mt-3 px-1 text-xs text-muted-foreground tabular-nums">
            {shown.length === content.data.hadiths.length
              ? t.hadithCount(content.data.hadiths.length)
              : t.hadithShown(shown.length, content.data.hadiths.length)}
          </p>
          {content.data.translatedIn !== lang && (
            <p className="mt-3 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              {content.data.translatedIn === 'en' ? t.hadithFallbackEnglish : t.hadithArabicOnly}
            </p>
          )}
        </>
      )}

      <div className="mt-4 space-y-5">
        {shown.map((hadith) => (
          <HadithCard key={hadith.number} hadith={hadith} reference={`${collectionName} ${hadith.number}`} />
        ))}
      </div>
      {content.data && shown.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">{t.hadithNoMatch}</p>
      )}

      {content.data && (prev || next) && (
        <nav aria-label={t.hadithBooks(collection?.books.length ?? 0)} className="mt-8 flex gap-3">
          {bookLink(prev, 'prev') ?? <span className="flex-1" />}
          {bookLink(next, 'next') ?? <span className="flex-1" />}
        </nav>
      )}
    </Shell>
  );
}
