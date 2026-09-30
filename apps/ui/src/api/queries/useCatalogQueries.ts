import type {
  CatalogEntry,
  CatalogSearchResult,
} from '@direktamt/integrations-contracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../ApiClient';

/**
 * GET /catalog — federal service catalog search.
 */
export function useSearchCatalog(
  term: string,
  limit?: number,
  offset?: number,
) {
  return useQuery({
    queryKey: ['catalog', 'search', term, limit, offset],
    queryFn: () =>
      apiClient.get<CatalogSearchResult>('/catalog', { term, limit, offset }),
    enabled: term.length > 0,
  });
}

/**
 * GET /catalog/{serviceCatalogKey} — one full catalog entry.
 */
export function useCatalogEntry(serviceCatalogKey: string) {
  return useQuery({
    queryKey: ['catalog', serviceCatalogKey],
    queryFn: () =>
      apiClient.get<CatalogEntry>(
        `/catalog/${encodeURIComponent(serviceCatalogKey)}`,
      ),
    enabled: serviceCatalogKey.length > 0,
  });
}
