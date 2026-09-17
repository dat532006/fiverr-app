import { queryOptions } from '@tanstack/react-query';
import { AppError } from '../../../shared/models/app-error';
import { mapTransportError } from '../../../infrastructure/http/map-transport-error';
import { fetchTaxonomyMenu } from '../api/taxonomy-menu.endpoint';
import { TaxonomyDecodeError } from '../api/taxonomy-menu.dto';
import { mapTaxonomyMenu } from '../model/map-taxonomy-menu';
import type { TaxonomyMenu } from '../model/taxonomy.model';

export const TAXONOMY_MENU_QUERY_KEY = ['public', 'taxonomy', 'menu'] as const;

const FIVE_MINUTES_MS = 5 * 60_000;

async function loadTaxonomyMenu(): Promise<TaxonomyMenu> {
  try {
    const dtos = await fetchTaxonomyMenu();
    return mapTaxonomyMenu(dtos);
  } catch (error) {
    if (error instanceof TaxonomyDecodeError) {
      throw new AppError('decode');
    }
    throw mapTransportError(error);
  }
}

export function isTransientAppError(error: unknown): boolean {
  return error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout');
}

export function isForbiddenAppError(error: unknown): boolean {
  return error instanceof AppError && error.kind === 'forbidden';
}

export function taxonomyMenuQueryOptions() {
  return queryOptions({
    queryKey: TAXONOMY_MENU_QUERY_KEY,
    queryFn: loadTaxonomyMenu,
    staleTime: FIVE_MINUTES_MS,
    gcTime: FIVE_MINUTES_MS,
    retry: (failureCount: number, error: unknown) => failureCount < 1 && isTransientAppError(error),
  });
}
