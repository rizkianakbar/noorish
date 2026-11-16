import { createStore } from '#/lib/store.ts';

/**
 * The hadith book read last, to pick up from the hadith home. On this
 * device only.
 */
export const hadithLastStore = createStore<{ collection: string; book: number; name: string } | null>(null, {
  key: 'quran:hadith-last',
});
