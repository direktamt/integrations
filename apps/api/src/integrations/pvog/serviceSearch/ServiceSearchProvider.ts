import type { ServiceSearchResult } from '@direktamt/integrations-contracts';
import { ServiceSearchOptions } from '../model/ServiceSearchOptions';
import { ServiceSearchCapabilities } from './ServiceSearchCapabilities';

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
  /**
   * What this adapter can honour; the facade rejects a request beyond it
   * before any upstream call.
   */
  readonly capabilities: ServiceSearchCapabilities;

  searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult>;
}
