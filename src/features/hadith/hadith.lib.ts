import { matchesAll, normalizeArabic, type ParsedQuery } from '#/features/search/search.lib.ts';
import type { Hadith, HadithBook, HadithCollection } from './hadith.types.ts';

/**
 * hadith-api on jsDelivr (public domain): CORS-open, cached a week, and
 * served a book ("section") at a time. Pinned to the major version, so its
 * shape can't change under us.
 */
export const HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

/**
 * Each collection's name in Arabic, set in Kufi beside its English one.
 */
export const ARABIC_COLLECTION_NAMES: Record<string, string> = {
  nawawi: 'الأربعون النووية',
  qudsi: 'الأحاديث القدسية',
  bukhari: 'صحيح البخاري',
  muslim: 'صحيح مسلم',
  abudawud: 'سنن أبي داود',
  tirmidhi: 'جامع الترمذي',
  nasai: 'سنن النسائي',
  ibnmajah: 'سنن ابن ماجه',
  malik: 'موطأ مالك',
};

/**
 * Book titles exist only in English, so common Indonesian topic words also
 * look for their English title words: "hadis makan" finds the books on Food.
 * Stems, matched inside words ("pray" finds "Prayers").
 */
const TOPICS: Record<string, string[]> = {
  makan: ['food', 'eat', 'meal'],
  makanan: ['food', 'eat'],
  minum: ['drink'],
  minuman: ['drink'],
  shalat: ['prayer', 'salat'],
  salat: ['prayer', 'salat'],
  sholat: ['prayer', 'salat'],
  solat: ['prayer', 'salat'],
  puasa: ['fasting', 'fasts', 'saum', 'sawm'],
  zakat: ['zakat'],
  sedekah: ['charity', 'sadaqa'],
  haji: ['hajj', 'pilgrim'],
  umrah: ['umrah'],
  nikah: ['marriage', 'nikah', 'wedlock'],
  menikah: ['marriage', 'nikah'],
  talak: ['divorce', 'talaq'],
  cerai: ['divorce'],
  wudhu: ['ablution', 'wudu', 'purif'],
  wudu: ['ablution', 'wudu', 'purif'],
  bersuci: ['purif', 'taharah'],
  mandi: ['bath', 'ghusl'],
  jual: ['sale', 'trade', 'business'],
  beli: ['sale', 'trade', 'business'],
  ilmu: ['knowledge'],
  adab: ['manners', 'etiquette', 'adab'],
  akhlak: ['manners', 'character'],
  jenazah: ['funeral'],
  iman: ['belief', 'faith', 'iman'],
  tobat: ['repent'],
  taubat: ['repent'],
  pakaian: ['dress', 'cloth'],
  tidur: ['sleep'],
  mimpi: ['dream'],
  waris: ['inherit'],
  warisan: ['inherit'],
  sumpah: ['oath', 'vow'],
  kurban: ['sacrifice'],
  qurban: ['sacrifice'],
  hutang: ['loan', 'debt'],
  utang: ['loan', 'debt'],
  riba: ['usury', 'riba'],
  jihad: ['jihad'],
  doa: ['supplication', 'invocation', 'dua'],
  zikir: ['remembrance', 'dhikr'],
  dzikir: ['remembrance', 'dhikr'],
  quran: ['quran', 'recit'],
  tafsir: ['tafsir', 'interpret'],
  medis: ['medicine'],
  obat: ['medicine'],
  sakit: ['sick', 'patient', 'medicine'],
  berburu: ['hunt'],
  hewan: ['animal'],
};

export const expandTopic = (term: string) => [term, ...(TOPICS[term] ?? [])];

export interface HadithTextHit {
  collection: HadithCollection;
  hadith: Hadith;
}

export interface HadithBookHit {
  collection: HadithCollection;
  book: HadithBook;
}

/**
 * Hadith whose text matches (the forties, which are small enough to search
 * on the device), and books across every collection whose title does.
 */
export function searchHadith(
  texts: HadithTextHit[],
  collections: HadithCollection[],
  query: ParsedQuery,
  limit = 6,
): { texts: HadithTextHit[]; books: HadithBookHit[] } {
  const textHits = texts
    .filter(({ hadith }) =>
      query.arabic
        ? !!hadith.arabic && normalizeArabic(hadith.arabic).includes(query.arabic)
        : !!hadith.translation && matchesAll(hadith.translation, query.terms, expandTopic),
    )
    .slice(0, limit);
  const books = query.arabic
    ? []
    : collections
        .filter((c) => c.books.length > 1)
        .flatMap((collection) =>
          collection.books
            .filter((book) => matchesAll(book.name, query.terms, expandTopic))
            .map((book) => ({ collection, book })),
        )
        .slice(0, limit * 2);
  return { texts: textHits, books };
}

/**
 * How a scholar's grading reads at a glance: authentic, good, or weak (and
 * worse), else unknown. Gradings come in many spellings ("Sahih", "Hasan
 * Sahih", "Da'if Jiddan", "Maudu`").
 */
export function gradeStrength(grade: string): 'sahih' | 'hasan' | 'weak' | null {
  const g = grade.toLowerCase();
  if (/da.?if|daif|weak|maud|mawd|munkar|shadh|fabricat|batil|lemah|palsu/.test(g)) return 'weak';
  if (g.includes('hasan')) return 'hasan';
  if (g.includes('sahih') || g.includes('shahih')) return 'sahih';
  return null;
}

/**
 * A translation split into its opening "Narrated Abu Huraira:" line (set
 * apart, as the chain it stands for) and the hadith itself.
 */
export function splitNarrator(text: string): { narrator: string | null; body: string } {
  const match = text.match(/^\s*(Narrated [^:\n]{2,90}:)\s*/);
  return match ? { narrator: match[1], body: text.slice(match[0].length) } : { narrator: null, body: text };
}

/**
 * Hadith whose translation or Arabic has every term, for finding one in a
 * book of hundreds.
 */
export function filterHadiths(hadiths: Hadith[], query: ParsedQuery): Hadith[] {
  if (!query.terms.length && !query.arabic) return hadiths;
  const number = query.terms.length === 1 && /^\d+$/.test(query.terms[0]) ? Number(query.terms[0]) : null;
  return hadiths.filter((h) =>
    number !== null
      ? Math.floor(h.number) === number
      : query.arabic
        ? !!h.arabic && normalizeArabic(h.arabic).includes(query.arabic)
        : !!h.translation && matchesAll(h.translation, query.terms, expandTopic),
  );
}
