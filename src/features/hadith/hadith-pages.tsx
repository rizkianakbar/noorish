import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Lattice } from '#/components/ornament/lattice.tsx';
import { PageShell } from '#/components/page-shell.tsx';
import { buttonVariants } from '#/components/ui/button.tsx';
import { Field, FieldLabel } from '#/components/ui/field.tsx';
import { Input } from '#/components/ui/input.tsx';
import { matchesAll, parseQuery } from '#/features/search/search.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';
import { hadithQueries } from './hadith.api.ts';
import { ARABIC_COLLECTION_NAMES, expandTopic } from './hadith.lib.ts';
import type { HadithCollection } from './hadith.types.ts';
import { HadithCard } from './hadith-card.tsx';

type ShellProps = { title: string; children: React.ReactNode };

function Shell(props: ShellProps) {
  const { title, children } = props;
  const t = useT();
  return (
    <PageShell title={title}>
      <div className="mt-6">{children}</div>
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

/**
 * The collections: the two forties first (where most people start), then
 * the six books and the Muwatta.
 */
export function HadithHome() {
  const t = useT();
  const name = useCollectionName();
  const { data, isError } = useQuery(hadithQueries.index());
  const featured = data?.collections.filter((c) => c.featured) ?? [];
  const books = data?.collections.filter((c) => !c.featured) ?? [];

  return (
    <Shell title={t.hadith}>
      {isError && <p className="text-sm text-destructive">{t.hadithLoadError}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {featured.map((c) => (
          <Link
            key={c.slug}
            to="/hadith/$collection"
            params={{ collection: c.slug }}
            className="pressable dark relative overflow-hidden rounded-[1.5rem] bg-(--ornament-field) px-5 pt-5 pb-4 text-foreground ring-1 ring-gold/30 hover:ring-gold/60">
            <Lattice className="opacity-50" />
            <span dir="rtl" lang="ar" className="relative block text-right font-kufi text-3xl text-gold">
              {ARABIC_COLLECTION_NAMES[c.slug]}
            </span>
            <span className="relative mt-4 flex items-end justify-between gap-3">
              <span>
                <span className="block font-serif text-lg leading-tight">{name(c)}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.hadithCount(c.count)}</span>
              </span>
              <ArrowRight className="mb-0.5 size-4 shrink-0 text-gold" />
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mt-9 mb-3 text-xs font-medium tracking-[0.16em] text-gold-ink uppercase">{t.hadithLibrary}</h2>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {books.map((c) => (
          <li key={c.slug}>
            <Link
              to="/hadith/$collection"
              params={{ collection: c.slug }}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'h-auto w-full justify-between gap-3 rounded-none px-4 py-3.5',
              )}>
              <span className="min-w-0 grow text-left">
                <span className="block truncate font-serif text-base font-normal">{name(c)}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {t.hadithCount(c.count)} · {t.hadithBooks(c.books.length)}
                </span>
              </span>
              <span dir="rtl" lang="ar" className="shrink-0 font-kufi text-lg font-normal text-gold-ink">
                {ARABIC_COLLECTION_NAMES[c.slug]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

type HadithCollectionPageProps = { slug: string };

/**
 * A collection's books. A single-book collection (the forties) goes straight
 * to its hadith.
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
        <Field className="mb-4">
          <FieldLabel htmlFor="hadith-book-filter" className="sr-only">
            {t.filterBooks}
          </FieldLabel>
          <Input
            id="hadith-book-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t.filterBooks}
            className="h-10"
          />
        </Field>
      )}
      {collection && books.length === 0 && <p className="text-sm text-muted-foreground">{t.noBookMatch}</p>}
      {collection && books.length > 0 && (
        <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
          {books.map((book) => (
            <li key={book.number}>
              <Link
                to="/hadith/$collection/$book"
                params={{ collection: slug, book: String(book.number) }}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'h-auto w-full justify-start gap-3 rounded-none px-4 py-3',
                )}>
                <span className="w-7 shrink-0 text-right text-xs font-normal text-muted-foreground tabular-nums">
                  {book.number}
                </span>
                <span className="min-w-0 grow text-left">
                  <span className="block truncate font-normal">{book.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground tabular-nums">
                    {t.hadithRange(Math.floor(book.first), Math.floor(book.last))}
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}

type HadithBookPageProps = { slug: string; book: number };

/**
 * A book's hadith, loaded from the source's CDN when opened.
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

  // Opened at a hadith (search, a copied link): bring it into view once the book has loaded.
  useEffect(() => {
    if (hash && content.data) document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [hash, content.data]);

  return (
    <Shell title={single || !info ? collectionName : info.name}>
      {!single && collection && (
        <Link
          to="/hadith/$collection"
          params={{ collection: slug }}
          className="-mt-3 mb-5 inline-block text-sm text-muted-foreground hover:text-gold-ink">
          {collectionName}
        </Link>
      )}
      {(index.isError || content.isError || (index.data && !info)) && (
        <p className="text-sm text-destructive">{t.hadithLoadError}</p>
      )}
      {content.isPending && info && <p className="text-sm text-muted-foreground">{t.hadithLoading}</p>}
      {content.data && content.data.translatedIn !== lang && (
        <p className="mb-4 rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          {content.data.translatedIn === 'en' ? t.hadithFallbackEnglish : t.hadithArabicOnly}
        </p>
      )}
      <div className="space-y-4">
        {content.data?.hadiths.map((hadith) => (
          <HadithCard key={hadith.number} hadith={hadith} reference={`${collectionName} ${hadith.number}`} />
        ))}
      </div>

      {content.data && (prev || next) && (
        <nav className="mt-8 flex justify-between gap-3">
          {prev ? (
            <Link
              to="/hadith/$collection/$book"
              params={{ collection: slug, book: String(prev.number) }}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 min-w-0 rounded-full')}>
              <ArrowLeft data-icon="inline-start" />
              <span className="truncate">{t.prevBook}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to="/hadith/$collection/$book"
              params={{ collection: slug, book: String(next.number) }}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 min-w-0 rounded-full')}>
              <span className="truncate">{t.nextBook}</span>
              <ArrowRight data-icon="inline-end" />
            </Link>
          )}
        </nav>
      )}
    </Shell>
  );
}
