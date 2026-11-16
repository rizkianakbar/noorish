import { createFileRoute, redirect } from '@tanstack/react-router';
import { categoryFromUrl } from '#/features/duas/duas.lib.ts';
import { DuasPage } from '#/features/duas/duas-page.tsx';

export const Route = createFileRoute('/duas/$category')({
  validateSearch: (search: Record<string, unknown>): { recite?: number } => {
    const n = Number(search.recite);
    return { recite: Number.isInteger(n) && n > 0 ? n : undefined };
  },
  beforeLoad: ({ params }) => {
    if (!categoryFromUrl(params.category)) throw redirect({ to: '/duas', replace: true });
  },
  component: function DuaCategoryRoute() {
    const category = categoryFromUrl(Route.useParams().category) ?? '';
    return <DuasPage key={category} category={category} recite={Route.useSearch().recite} />;
  },
});
