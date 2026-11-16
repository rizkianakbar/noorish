import { lazy } from 'react';

/**
 * Run `fn` when the browser is idle (within `timeout` ms at the latest).
 * Safari has no requestIdleCallback; there it runs after `fallbackDelay`.
 * Returns a cancel function.
 */
export function onIdle(fn: () => void, { timeout = 1000, fallbackDelay = 150 } = {}): () => void {
  if (typeof requestIdleCallback === 'undefined') {
    const timer = setTimeout(fn, fallbackDelay);
    return () => clearTimeout(timer);
  }
  const id = requestIdleCallback(fn, { timeout });
  return () => cancelIdleCallback(id);
}

/**
 * A component split into its own chunk, off the first load, and fetched once
 * the page is idle, so the first time it is opened is still instant.
 */
export function lazyOnIdle<T extends React.ComponentType<any>>(
  load: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  if (typeof window !== 'undefined') onIdle(() => void load().catch(() => {}), { timeout: 6000, fallbackDelay: 3000 });
  return lazy(load);
}
