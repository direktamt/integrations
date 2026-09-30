import type {
  OnlineService,
  OnlineServiceAuthority,
} from '@direktamt/integrations-contracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../ApiClient';

/**
 * GET /online-services — online-application links for a territory,
 * optionally filtered by comma-separated LeiKa keys.
 */
export function useOnlineServices(
  regionalKey: string,
  serviceCatalogKeys?: string[],
) {
  return useQuery({
    queryKey: ['onlineServices', regionalKey, serviceCatalogKeys],
    queryFn: () =>
      apiClient.get<OnlineService[]>('/online-services', {
        regionalKey,
        serviceCatalogKeys: serviceCatalogKeys?.length
          ? serviceCatalogKeys.join(',')
          : undefined,
      }),
    enabled: regionalKey.length > 0,
  });
}

/**
 * GET /online-services/{id}/authorities — authorities responsible for one
 * online service with their roles, addresses and contact channels.
 */
export function useOnlineServiceAuthorities(id: string) {
  return useQuery({
    queryKey: ['onlineServices', id, 'authorities'],
    queryFn: () =>
      apiClient.get<OnlineServiceAuthority[]>(
        `/online-services/${encodeURIComponent(id)}/authorities`,
      ),
    enabled: id.length > 0,
  });
}
