import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { HandHeart, ScrollText } from 'lucide-react';
import { duaQueries } from '#/features/duas/duas.api.ts';
import { DUA_URL_SLUGS, type DuaHit, searchDuas } from '#/features/duas/duas.lib.ts';
import { hadithQueries } from '#/features/hadith/hadith.api.ts';
import { type HadithTextHit, searchHadith } from '#/features/hadith/hadith.lib.ts';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import type { ParsedQuery } from './search.lib.ts';

/**
 * The two forties are small enough to search in full on the device; the
 * big collections are searched by book title (see `searchHadith`).
 */
const SEARCHABLE_TEXT = ['nawawi', 'qudsi'];

/**
 * Duas and hadith matching a search. Their data loads on the first search
 * (`enabled`), not with the panel.
 */
export function useDuaHadithSearch(query: ParsedQuery, enabled: boolean) {
  const duaIndex = useQuery({ ...duaQueries.index(), enabled });
  const duaCategories = useQueries({
    queries: (enabled ? (duaIndex.data?.categories ?? []) : []).map((c) => duaQueries.category(c.slug)),
  });
  const hadithIndex = useQuery({ ...hadithQueries.index(), enabled });
  const forties = useQueries({
    queries: (enabled ? SEARCHABLE_TEXT : []).map((slug) => hadithQueries.book(slug, 1, 'en')),
  });

  const categories = duaIndex.data?.categories;
  const collections = hadithIndex.data?.collections;
  // About 180 short texts: cheap enough to search on every keystroke, no memo needed.
  const duaEntries = (categories ?? []).flatMap((c, i) =>
    (duaCategories[i]?.data ?? []).map((dua): DuaHit => ({ dua, category: c.slug })),
  );
  const hadithTexts = SEARCHABLE_TEXT.flatMap((slug, i) => {
    const collection = collections?.find((c) => c.slug === slug);
    return collection ? (forties[i]?.data?.hadiths ?? []).map((hadith): HadithTextHit => ({ collection, hadith })) : [];
  });
  const hasQuery = query.terms.length > 0 || !!query.arabic;

  return {
    duas: hasQuery ? searchDuas(duaEntries, query) : [],
    hadith: hasQuery ? searchHadith(hadithTexts, collections ?? [], query) : { texts: [], books: [] },
    // "doa" or "hadis" alone: offer the categories or collections to browse.
    browseDuas: !hasQuery && query.intent === 'dua' ? (categories ?? []) : [],
    browseHadith: !hasQuery && query.intent === 'hadith' ? (collections ?? []) : [],
  };
}

type SectionHeadingProps = { icon: React.ReactNode; children: string };

function SectionHeading(props: SectionHeadingProps) {
  const { icon, children } = props;
  return (
    <h3 className="sticky top-0 z-10 flex items-center gap-2 border-b bg-popover/95 px-5 py-2 text-xs font-medium tracking-[0.14em] text-gold-ink uppercase backdrop-blur [&_svg]:size-3.5">
      {icon}
      {children}
    </h3>
  );
}

const row = 'block border-b px-5 py-3 text-sm transition-colors hover:bg-muted';

type DuaResultsProps = { results: ReturnType<typeof useDuaHadithSearch> };

export function DuaResults(props: DuaResultsProps) {
  const { results } = props;
  const t = useT();
  const { language } = usePrefs();
  if (!results.duas.length && !results.browseDuas.length) return null;

  return (
    <section>
      <SectionHeading icon={<HandHeart />}>{t.duas}</SectionHeading>
      <ul>
        {results.browseDuas.map((c) => (
          <li key={c.slug}>
            <Link to="/duas/$category" params={{ category: DUA_URL_SLUGS[c.slug] }} className={row}>
              <span className="font-serif text-base">{c.name[language]}</span>
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">{c.count}</span>
            </Link>
          </li>
        ))}
        {results.duas.map(({ dua, category }) => (
          <li key={dua.id}>
            <Link to="/duas/$category" params={{ category: DUA_URL_SLUGS[category] }} hash={dua.id} className={row}>
              <span className="block font-serif text-base">{dua.title[language]}</span>
              <span className="mt-0.5 line-clamp-2 leading-snug text-muted-foreground">
                {dua.translation[language]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

type HadithResultsProps = { results: ReturnType<typeof useDuaHadithSearch> };

export function HadithResults(props: HadithResultsProps) {
  const { results } = props;
  const t = useT();
  const name = (slug: string, fallback: string) =>
    t.hadithCollections[slug as keyof typeof t.hadithCollections] ?? fallback;
  const { texts, books } = results.hadith;
  if (!texts.length && !books.length && !results.browseHadith.length) return null;

  return (
    <section>
      <SectionHeading icon={<ScrollText />}>{t.hadith}</SectionHeading>
      <ul>
        {results.browseHadith.map((c) => (
          <li key={c.slug}>
            <Link to="/hadith/$collection" params={{ collection: c.slug }} className={row}>
              <span className="font-serif text-base">{name(c.slug, c.name)}</span>
              <span className="ml-2 text-xs text-muted-foreground">{t.hadithCount(c.count)}</span>
            </Link>
          </li>
        ))}
        {texts.map(({ collection, hadith }) => (
          <li key={`${collection.slug}-${hadith.number}`}>
            <Link
              to="/hadith/$collection/$book"
              params={{ collection: collection.slug, book: String(collection.books[0].number) }}
              hash={`h${hadith.number}`}
              className={row}>
              <span className="text-xs font-medium text-gold-ink">
                {name(collection.slug, collection.name)} {Math.floor(hadith.number)}
              </span>
              <span className="mt-0.5 line-clamp-2 leading-snug">{hadith.translation}</span>
            </Link>
          </li>
        ))}
        {books.map(({ collection, book }) => (
          <li key={`${collection.slug}-${book.number}`}>
            <Link
              to="/hadith/$collection/$book"
              params={{ collection: collection.slug, book: String(book.number) }}
              className={row}>
              <span className="block">{book.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {name(collection.slug, collection.name)} · {t.hadithBookShort(book.number)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
