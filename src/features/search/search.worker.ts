/// <reference lib="webworker" />

import { type IndexedVerse, type SearchLang, searchIndex, searchIndexPath } from './search.lib.ts';
import type { SearchRequest, SearchResponse } from './search.types.ts';

/**
 * Full-text search over all 6,236 verses, off the main thread. The index is
 * prebuilt and prefolded per language (`bun quran:build`), so it is one
 * fetch and one parse; each language is loaded once and kept for the session.
 */

const indexes = new Map<SearchLang, Promise<IndexedVerse[]>>();

const post = (message: SearchResponse) => self.postMessage(message);

function load(lang: SearchLang): Promise<IndexedVerse[]> {
  let index = indexes.get(lang);
  if (!index) {
    index = fetch(searchIndexPath(lang)).then((res) => {
      if (!res.ok) throw new Error(`Failed to load the search index: ${res.status}`);
      return res.json();
    });
    // A failed load is retried on the next message.
    index.catch(() => indexes.delete(lang));
    indexes.set(lang, index);
  }
  return index;
}

self.onmessage = async (event: MessageEvent<SearchRequest>) => {
  const message = event.data;
  try {
    const index = await load(message.lang);
    if (message.type === 'init') return post({ type: 'ready' });
    post({ type: 'results', id: message.id, hits: searchIndex(index, message.query) });
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : 'Search failed' });
  }
};
