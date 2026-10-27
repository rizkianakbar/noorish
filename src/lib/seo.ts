import type { AnyRouteMatch } from '@tanstack/react-router';
import { categoryFromUrl, DUA_URL_SLUGS } from '#/features/duas/duas.lib.ts';
import type { DuaIndex } from '#/features/duas/duas.types.ts';
import duaIndexJson from '#/features/duas/duas-index.json' with { type: 'json' };
import type { HadithBook, HadithCollection, HadithIndex } from '#/features/hadith/hadith.types.ts';
import hadithIndexJson from '#/features/hadith/hadith-index.json' with { type: 'json' };
import { messagesFor } from './i18n.ts';
import chapters from './quran/chapters.json' with { type: 'json' };
import type { Chapter } from './quran/types.ts';

/**
 * Per-page <head> for search engines and link previews. Route components
 * render on the client (see `src/start.ts`), so only the root route's
 * `head()` runs on the server: it builds every page's tags from the matched
 * route, and the chapter names are bundled so server and client agree.
 */
export const SITE_URL = 'https://noorish.rzknkbr.xyz';
const SITE_NAME = 'Noorish';

// 'and', not '&': link-preview tools count the escaped `&amp;` against the ~60 limit.
// Leads with "Noorish Quran", the name people search the site by.
const HOME_TITLE = 'Noorish Quran: Read the Quran Word by Word, with Tafsir and Audio';
const HOME_DESCRIPTION =
  'Read all 114 surahs of the Quran in Arabic with word-by-word meanings, English and Indonesian translations, Ibn Kathir tafsir, and verse-by-verse recitation.';
/**
 * Link previews show ~125 characters, fewer than search results.
 */
const HOME_SOCIAL_DESCRIPTION =
  'Read all 114 surahs in Arabic, word by word, with English and Indonesian translations, Ibn Kathir tafsir and recitation.';
/**
 * 1200×630 (1.91:1), the size Facebook, X, LinkedIn and chat apps expect.
 */
const OG_IMAGE = {
  url: `${SITE_URL}/og.jpg`,
  width: '1200',
  height: '630',
  alt: 'Noorish: read the Quran, word by word',
};

/**
 * Last-modified timestamp for crawlers. Evaluated once when the server
 * module loads, so it changes per deploy rather than per request. Set
 * `VITE_LAST_MODIFIED` at build time (e.g. to the commit date) to pin it.
 */
const LAST_MODIFIED: string = import.meta.env.VITE_LAST_MODIFIED ?? new Date().toISOString();

type Head = {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<{ type: string; children: string }>;
};

function jsonLd(data: object) {
  return { type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', ...data }) };
}

function page({
  title,
  description,
  socialDescription,
  path,
}: {
  title: string;
  description: string;
  socialDescription: string;
  path: string;
}): Omit<Head, 'scripts'> & { url: string } {
  const url = `${SITE_URL}${path}`;
  return {
    url,
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:title', content: title },
      { property: 'og:description', content: socialDescription },
      { property: 'og:url', content: url },
      { property: 'og:image', content: OG_IMAGE.url },
      { property: 'og:image:width', content: OG_IMAGE.width },
      { property: 'og:image:height', content: OG_IMAGE.height },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      { property: 'og:updated_time', content: LAST_MODIFIED },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: url }],
  };
}

function homeHead(): Head {
  const { meta, links } = page({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    socialDescription: HOME_SOCIAL_DESCRIPTION,
    path: '/',
  });
  return {
    meta,
    links,
    scripts: [
      jsonLd({
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: SITE_NAME,
            // Google's site name in results comes from these.
            alternateName: ['Noorish Quran', 'Noorish: Quran, Hadith & Doa'],
            description: HOME_DESCRIPTION,
            inLanguage: ['en', 'id'],
            publisher: { '@id': `${SITE_URL}/#organization` },
            dateModified: LAST_MODIFIED,
          },
          {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            logo: `${SITE_URL}/icon-512.png`,
          },
          {
            '@type': 'WebApplication',
            '@id': `${SITE_URL}/#app`,
            url: `${SITE_URL}/`,
            name: SITE_NAME,
            description: HOME_DESCRIPTION,
            applicationCategory: 'ReferenceApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            image: `${SITE_URL}/apple-touch-icon.png`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            dateModified: LAST_MODIFIED,
          },
        ],
      }),
    ],
  };
}

function surahHead(chapter: Chapter): Head {
  const place = chapter.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan';
  const title = `Surah ${chapter.nameSimple} (${chapter.number}) – ${chapter.nameEn}, Word by Word | ${SITE_NAME}`;
  const description = `Read Surah ${chapter.nameSimple} (${chapter.nameArabic}), “${chapter.nameEn}”, a ${place} surah of ${chapter.versesCount} verses, in Arabic with word-by-word meanings, translation, Ibn Kathir tafsir, and recitation.`;
  const socialDescription = `Surah ${chapter.nameSimple}, “${chapter.nameEn}”: ${chapter.versesCount} verses, word by word, with tafsir and recitation.`;
  const { url, meta, links } = page({ title, description, socialDescription, path: `/surah/${chapter.number}` });
  return {
    meta,
    links,
    scripts: [
      jsonLd({
        '@graph': [
          {
            '@type': 'Chapter',
            '@id': `${url}#chapter`,
            url,
            name: `Surah ${chapter.nameSimple}`,
            alternateName: [chapter.nameArabic, chapter.nameEn],
            position: chapter.number,
            description,
            inLanguage: 'ar',
            isPartOf: { '@type': 'Book', name: 'The Quran', inLanguage: 'ar' },
            dateModified: LAST_MODIFIED,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: `Surah ${chapter.nameSimple}`, item: url },
            ],
          },
        ],
      }),
    ],
  };
}

/**
 * Pages that set their own <title>, in the reader's language. Per-device
 * tools, so not indexed.
 */
function breadcrumbs(items: { name: string; path: string }[]) {
  return jsonLd({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  });
}

/*
 * Duas and hadith titles name things in both languages, Indonesian first
 * where people search in it ("Dzikir Pagi", "Shahih al-Bukhari"), so either
 * search finds the page. The server can't know a reader's language: it lives
 * in their browser.
 */
const duaIndex = duaIndexJson as DuaIndex;
const hadithIndex = hadithIndexJson as HadithIndex;

function duasHead(slug?: string): Head {
  const category = duaIndex.categories.find((c) => c.slug === slug);
  const total = duaIndex.categories.reduce((n, c) => n + c.count, 0);
  const trail = [
    { name: SITE_NAME, path: '/' },
    { name: 'Duas', path: '/duas' },
  ];
  if (!category) {
    const { meta, links } = page({
      title: `Doa & Dzikir (Duas & Dhikr): Pagi, Petang & Harian | ${SITE_NAME}`,
      description: `Dzikir pagi dan petang, dzikir setelah shalat, dan doa harian: ${total} doa dalam bahasa Arab dengan latin, arti, dan sumber haditsnya. Morning and evening dhikr and daily duas, with translation.`,
      socialDescription: `${total} duas and adhkar in Arabic, with transliteration and translation.`,
      path: '/duas',
    });
    return { meta, links, scripts: [breadcrumbs(trail)] };
  }
  const path = `/duas/${DUA_URL_SLUGS[category.slug]}`;
  const { meta, links } = page({
    title: `${category.name.id} (${category.name.en}): Arab, Latin & Arti | ${SITE_NAME}`,
    description: `Bacaan ${category.name.id.toLowerCase()} lengkap: ${category.count} doa dalam bahasa Arab dengan latin, arti, dan sumber haditsnya. ${category.name.en} in Arabic with transliteration and English translation.`,
    socialDescription: `${category.name.id}: ${category.count} doa dengan latin dan arti.`,
    path,
  });
  return { meta, links, scripts: [breadcrumbs([...trail, { name: category.name.id, path }])] };
}

function collectionNames(collection: HadithCollection) {
  const key = collection.slug as keyof ReturnType<typeof messagesFor>['hadithCollections'];
  return {
    en: messagesFor('en').hadithCollections[key] ?? collection.name,
    id: messagesFor('id').hadithCollections[key] ?? collection.name,
  };
}

function translatedIn(collection: HadithCollection) {
  return collection.translations.includes('id') ? 'English and Indonesian translations' : 'English translation';
}

function hadithHomeHead(): Head {
  const { meta, links } = page({
    title: `Kumpulan Hadits (Hadith): Bukhari, Muslim, Arbain & More | ${SITE_NAME}`,
    description:
      'Baca hadits Shahih al-Bukhari, Shahih Muslim, Sunan, dan Hadits Arbain an-Nawawi dalam bahasa Arab dengan terjemahan. The major hadith collections in Arabic with English and Indonesian translations.',
    socialDescription: 'The major hadith collections in Arabic, with English and Indonesian translations.',
    path: '/hadith',
  });
  return {
    meta,
    links,
    scripts: [
      breadcrumbs([
        { name: SITE_NAME, path: '/' },
        { name: 'Hadith', path: '/hadith' },
      ]),
    ],
  };
}

function collectionHead(collection: HadithCollection): Head {
  const names = collectionNames(collection);
  const path = `/hadith/${collection.slug}`;
  const { meta, links } = page({
    title: `${names.id} (${names.en}): ${collection.count.toLocaleString('en')} Hadith | ${SITE_NAME}`,
    description: `Baca ${names.id} lengkap, ${collection.books.length} kitab, dalam bahasa Arab dengan terjemahan. ${names.en} in Arabic with ${translatedIn(collection)} and gradings, book by book.`,
    socialDescription: `${names.en}: ${collection.count.toLocaleString('en')} hadith in Arabic with translation.`,
    path,
  });
  const trail = [
    { name: SITE_NAME, path: '/' },
    { name: 'Hadith', path: '/hadith' },
    { name: names.en, path },
  ];
  return { meta, links, scripts: [breadcrumbs(trail)] };
}

/**
 * A book of hadith. A collection that is one book (the forties) is titled
 * as the collection, at its one book's URL.
 */
function bookHead(collection: HadithCollection, book: HadithBook): Head {
  const names = collectionNames(collection);
  const path = `/hadith/${collection.slug}/${book.number}`;
  const single = collection.books.length === 1;
  const range = `${Math.floor(book.first)}–${Math.floor(book.last)}`;
  const { meta, links } = page({
    title: single
      ? `${names.id} (${names.en}): Arab & Terjemahan | ${SITE_NAME}`
      : `${book.name}: ${names.id} | ${SITE_NAME}`,
    description: single
      ? `${names.id} lengkap, ${collection.count} hadits dalam bahasa Arab dengan terjemahan. ${names.en} in Arabic with ${translatedIn(collection)}.`
      : `${book.name}, hadits ${range} dari ${names.id}: teks Arab dan terjemahan. Hadith ${range} of ${names.en}, in Arabic with ${translatedIn(collection)}.`,
    socialDescription: single
      ? `${names.en} in Arabic with translation.`
      : `${book.name}: hadith ${range} of ${names.en}.`,
    path,
  });
  const trail = [
    { name: SITE_NAME, path: '/' },
    { name: 'Hadith', path: '/hadith' },
    ...(single ? [] : [{ name: names.en, path: `/hadith/${collection.slug}` }]),
    { name: single ? names.en : book.name, path },
  ];
  return { meta, links, scripts: [breadcrumbs(trail)] };
}

const CLIENT_TITLED = new Set(['/settings', '/prayer-times', '/qibla', '/memorize']);

const noindex: Head = {
  meta: [{ title: SITE_NAME }, { name: 'robots', content: 'noindex' }],
  links: [],
  scripts: [],
};

/**
 * Tags for the deepest match: home, surahs, duas and hadith are indexable;
 * login, settings, the personal tools (prayer, qibla, memorize) and
 * not-found pages are not.
 */
export function pageHead(matches: AnyRouteMatch[]): Head {
  const leaf = matches.at(-1);
  if (!leaf || leaf.status === 'notFound') return noindex;
  if (leaf.routeId === '/') return homeHead();
  if (leaf.routeId === '/surah/$surah') {
    const chapter = (chapters as Chapter[])[Number(leaf.params.surah) - 1];
    if (chapter) return surahHead(chapter);
  }
  if (leaf.routeId === '/duas/') return duasHead();
  if (leaf.routeId === '/duas/$category') {
    const slug = categoryFromUrl(String(leaf.params.category));
    if (slug) return duasHead(slug);
  }
  if (leaf.routeId === '/hadith/') return hadithHomeHead();
  const collection = hadithIndex.collections.find((c) => c.slug === leaf.params.collection);
  if (collection && leaf.routeId === '/hadith/$collection/') {
    return collection.books.length === 1 ? bookHead(collection, collection.books[0]) : collectionHead(collection);
  }
  const book = collection?.books.find((b) => b.number === Number(leaf.params.book));
  if (collection && book && leaf.routeId === '/hadith/$collection/$book') return bookHead(collection, book);
  // These title themselves in the reader's language.
  if (CLIENT_TITLED.has(leaf.routeId)) return { ...noindex, meta: noindex.meta.filter((tag) => !('title' in tag)) };
  return noindex;
}
