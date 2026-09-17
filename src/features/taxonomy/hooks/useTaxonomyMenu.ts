import { useQuery } from '@tanstack/react-query';
import { taxonomyMenuQueryOptions } from '../queries/taxonomy-menu.query-options';

type UseTaxonomyMenuOptions = Readonly<{ enabled?: boolean }>;

// `enabled` lets chrome-level consumers (the header menu widget) defer the
// fetch until the panel is actually opened, while page sections that always
// need the data (Home's category/group strips) keep the default eager fetch.
export function useTaxonomyMenu(options: UseTaxonomyMenuOptions = {}) {
  return useQuery({ ...taxonomyMenuQueryOptions(), enabled: options.enabled ?? true });
}
