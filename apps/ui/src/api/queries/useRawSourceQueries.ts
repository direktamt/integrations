import type { RawSourceResponse } from '@direktamt/integrations-contracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../ApiClient';

/**
 * Resources with a raw PVOG JZuFi representation; the value is the path
 * segment of the integrations API.
 */
export type RawPvogResource = 'services' | 'online-services';

/**
 * GET /raw/pvog/{resource}/{id}/jzufi-2-3 — the provider's JZuFi 2.3 body
 * of a service description or an online service, unchanged.
 */
export function useRawPvogJzufi(resource: RawPvogResource, id: string) {
  return useQuery({
    queryKey: ['raw', 'pvog', resource, id, 'jzufi-2-3'],
    queryFn: () =>
      apiClient.get<RawSourceResponse>(
        `/raw/pvog/${resource}/${encodeURIComponent(id)}/jzufi-2-3`,
      ),
    enabled: id.length > 0,
  });
}
