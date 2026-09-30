import type { OnlineService } from '@direktamt/integrations-contracts';
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
