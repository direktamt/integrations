import type {
  Location,
  LocationSuggestion,
} from '@direktamt/integrations-contracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../ApiClient';

/**
 * GET /locations/suggestions — autocomplete for the city input.
 */
export function useSuggestLocations(query: string) {
  return useQuery({
    queryKey: ['locations', 'suggestions', query],
    queryFn: () =>
      apiClient.get<LocationSuggestion[]>('/locations/suggestions', { query }),
    enabled: query.length > 0,
  });
}

/**
 * GET /locations — resolve a city name or postal code to territories.
 */
export function useResolveLocation(cityName?: string, postalCode?: string) {
  return useQuery({
    queryKey: ['locations', 'resolve', cityName, postalCode],
    queryFn: () =>
      apiClient.get<Location[]>('/locations', { cityName, postalCode }),
    enabled: Boolean(cityName || postalCode),
  });
}

/**
 * GET /locations/{regionalKey} — reverse lookup of a territory.
 */
export function useLocation(regionalKey: string) {
  return useQuery({
    queryKey: ['locations', regionalKey],
    queryFn: () =>
      apiClient.get<Location>(`/locations/${encodeURIComponent(regionalKey)}`),
    enabled: regionalKey.length > 0,
  });
}
