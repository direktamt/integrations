import type {
  PublicAuthority,
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../ApiClient';

/**
 * Parameters of GET /services, mirroring integrations API SearchServicesQuery.
 * The boolean options are real booleans: `false` is sent explicitly because
 * the API defaults both of them to true.
 */
export interface SearchServicesParams {
  regionalKey: string;
  query: string;
  size?: number;
  page?: number;
  fuzzySearch?: boolean;
  useRegionalHierarchy?: boolean;
  lifeSituationCodes?: string[];
  validDate?: string;
}

/**
 * GET /services — plain-language service search within a territory.
 */
export function useSearchServices(params: SearchServicesParams) {
  return useQuery({
    queryKey: ['services', 'search', params],
    queryFn: () =>
      apiClient.get<ServiceSearchResult>('/services', {
        ...params,
        lifeSituationCodes: params.lifeSituationCodes?.length
          ? params.lifeSituationCodes.join(',')
          : undefined,
      }),
    enabled: params.regionalKey.length > 0 && params.query.length > 0,
  });
}

/**
 * GET /services/{id} — one service description for a territory.
 */
export function useService(
  id: string,
  regionalKey: string,
  useRegionalHierarchy: boolean,
) {
  return useQuery({
    queryKey: ['services', id, regionalKey, useRegionalHierarchy],
    queryFn: () =>
      apiClient.get<PublicServiceDescription>(
        `/services/${encodeURIComponent(id)}`,
        { regionalKey, useRegionalHierarchy },
      ),
    enabled: id.length > 0 && regionalKey.length > 0,
  });
}

/**
 * GET /services/{id}/authorities — authorities responsible for a service
 * within a territory, with addresses, contact channels and websites.
 */
export function useServiceAuthorities(
  id: string,
  regionalKey: string,
  useRegionalHierarchy: boolean,
) {
  return useQuery({
    queryKey: [
      'services',
      id,
      'authorities',
      regionalKey,
      useRegionalHierarchy,
    ],
    queryFn: () =>
      apiClient.get<PublicAuthority[]>(
        `/services/${encodeURIComponent(id)}/authorities`,
        { regionalKey, useRegionalHierarchy },
      ),
    enabled: id.length > 0 && regionalKey.length > 0,
  });
}
