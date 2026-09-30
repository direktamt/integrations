import type { ServiceSearchResult } from '@direktamt/integrations-contracts';
import { ServiceSearchOptions } from '../model/ServiceSearchOptions';

/**
 * Injection token of the service-search adapter selected at startup
 * (PVOG_SERVICE_SEARCH_VERSION); consumers depend on the interface only.
 */
export const SERVICE_SEARCH_PROVIDER = Symbol('ServiceSearchProvider');

/**
 * Plain-language service search within a territory. Every implementation
 * — one per upstream API version — returns the same normalized
 * ServiceSearchResult, so that the public GET /services contract does not
 * change when the upstream version does.
 */
export interface ServiceSearchProvider {
  searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult>;
}
