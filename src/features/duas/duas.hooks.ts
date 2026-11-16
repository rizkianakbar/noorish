import { useQueries, useQuery } from '@tanstack/react-query';
import { duaQueries } from './duas.api.ts';
import type { Dua } from './duas.types.ts';

/**
 * Every category with its duas (small static files, cached offline once
 * seen), for the hub's progress and its search across all of them.
 */
export function useAllDuas() {
  const index = useQuery(duaQueries.index());
  const categories = index.data?.categories ?? [];
  const lists = useQueries({ queries: categories.map((c) => duaQueries.category(c.slug)) });
  const byCategory: Record<string, Dua[] | undefined> = Object.fromEntries(
    categories.map((c, i) => [c.slug, lists[i]?.data]),
  );
  return { categories, byCategory, isError: index.isError || lists.some((l) => l.isError) };
}
