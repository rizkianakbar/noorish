import { useSyncExternalStore } from 'react';

/**
 * A minimal external store: `get`/`set`/`subscribe` plus a React hook that
 * re-renders on change. Optionally persisted to localStorage under `key`.
 *
 * Server-rendered pages (the surah reader) render and hydrate with
 * `serverValue` (by default `initial`): the server can't read this device's
 * storage, so the first browser render must match what it drew. React then
 * re-renders with the stored value straight after hydrating.
 */
export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  use: () => T;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)
      ? { ...fallback, ...parsed }
      : parsed;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the in-memory value still works.
  }
}

export function createStore<T>(
  initial: T,
  opts: { key?: string; persistDelayMs?: number; serverValue?: T } = {},
): Store<T> {
  const { key, persistDelayMs = 0, serverValue = initial } = opts;
  const getServerSnapshot = () => serverValue;
  let value = key ? readStorage(key, initial) : initial;
  const listeners = new Set<() => void>();
  let persistTimer: ReturnType<typeof setTimeout> | undefined;

  const persist = () => {
    if (!key) return;
    clearTimeout(persistTimer);
    if (persistDelayMs === 0) writeStorage(key, value);
    else persistTimer = setTimeout(() => writeStorage(key, value), persistDelayMs);
  };

  if (key && persistDelayMs > 0 && typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      clearTimeout(persistTimer);
      writeStorage(key, value);
    });
  }

  const store: Store<T> = {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      persist();
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    use: () => useSyncExternalStore(store.subscribe, store.get, getServerSnapshot),
  };

  return store;
}
