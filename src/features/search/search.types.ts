export interface SearchHit {
  surah: number;
  verse: number;
  /**
   * The matching translation, or the transliteration when only it matched.
   */
  text: string;
  viaLatin: boolean;
}

export type SearchRequest =
  | { type: 'init'; lang: 'en' | 'id' }
  | { type: 'query'; id: number; query: string; lang: 'en' | 'id' };

export type SearchResponse =
  | { type: 'ready' }
  | { type: 'results'; id: number; hits: SearchHit[] }
  | { type: 'error'; message: string };
