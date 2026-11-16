import { createFileRoute, redirect } from '@tanstack/react-router';
import { DUA_URL_SLUGS } from '#/features/duas/duas.lib.ts';
import { DuasHome } from '#/features/duas/duas-home.tsx';

export const Route = createFileRoute('/duas/')({
  // Links from before categories had their own URLs (`/duas?category=morning-dhikr`).
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({
    category: typeof search.category === 'string' ? search.category : undefined,
  }),
  beforeLoad: ({ search }) => {
    const slug = search.category && DUA_URL_SLUGS[search.category];
    if (slug) throw redirect({ to: '/duas/$category', params: { category: slug }, replace: true });
  },
  component: () => <DuasHome />,
});
