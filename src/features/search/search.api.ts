import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { createStore } from '#/lib/store.ts';
import type { SearchHit, SearchRequest, SearchResponse } from './search.types.ts';

/**
 * How far the worker's index is: surah files loaded (of 114), and whether it
 * can answer queries yet.
 */
export const searchIndexStore = createStore<{ loaded: number; ready: boolean; error: string | null }>({
  loaded: 0,
  ready: false,
  error: null,
});

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (hits: SearchHit[]) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<SearchResponse>) => {
    const message = event.data;
    if (message.type === 'progress') searchIndexStore.set((s) => ({ ...s, loaded: message.loaded }));
    else if (message.type === 'ready') searchIndexStore.set((s) => ({ ...s, ready: true, error: null }));
    else if (message.type === 'error') searchIndexStore.set((s) => ({ ...s, error: message.message }));
    else {
      searchIndexStore.set((s) => (s.ready ? s : { ...s, ready: true }));
      pending.get(message.id)?.(message.hits);
      pending.delete(message.id);
    }
  };
  return worker;
}

/**
 * Start building the index in the background. Safe to call repeatedly.
 */
export function warmSearch() {
  if (typeof Worker === 'undefined') return;
  if (!worker) getWorker().postMessage({ type: 'init' } satisfies SearchRequest);
}

export function searchVerses(query: string, lang: 'en' | 'id'): Promise<SearchHit[]> {
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    getWorker().postMessage({ type: 'query', id, query, lang } satisfies SearchRequest);
  });
}

export const searchQueries = {
  verses: (query: string, lang: 'en' | 'id') =>
    queryOptions({
      queryKey: ['search', lang, query],
      // Keeps its query, so highlights match the results on screen, not the newer text being searched.
      queryFn: async () => ({ query, hits: await searchVerses(query, lang) }),
      enabled: query.length >= 3,
      // Until the new answer arrives, the previous results stay up.
      placeholderData: keepPreviousData,
      // The index never changes while the app is open.
      staleTime: Number.POSITIVE_INFINITY,
    }),
};
