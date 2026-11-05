import type {
  CatalogEntry,
  CatalogEntryService,
  CatalogSearchResult,
} from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { GetCatalogEntryRequest } from '../request/GetCatalogEntryRequest.js';
import type { ListCatalogEntryServicesRequest } from '../request/ListCatalogEntryServicesRequest.js';
import type { SearchCatalogRequest } from '../request/SearchCatalogRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Federal LeiKa service catalog and the service descriptions a territory
 * publishes for a catalog key.
 */
export class CatalogApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /catalog — full-text search over the catalog.
   */
  search(
    request: SearchCatalogRequest,
    options?: RequestOptions,
  ): Promise<CatalogSearchResult> {
    return this.transport.get('/catalog', request, options);
  }

  /**
   * GET /catalog/{serviceCatalogKey} — one entry; 404 when unknown.
   */
  get(
    request: GetCatalogEntryRequest,
    options?: RequestOptions,
  ): Promise<CatalogEntry> {
    return this.transport.get(
      `/catalog/${segment(request.serviceCatalogKey)}`,
      {},
      options,
    );
  }

  /**
   * GET /catalog/{serviceCatalogKey}/services — the territory's published
   * service descriptions for the key, each marked EXACT or HIERARCHY (a
   * more specific or, failing that, more general key); empty when nothing
   * is published.
   */
  listServices(
    request: ListCatalogEntryServicesRequest,
    options?: RequestOptions,
  ): Promise<CatalogEntryService[]> {
    const { serviceCatalogKey, ...query } = request;

    return this.transport.get(
      `/catalog/${segment(serviceCatalogKey)}/services`,
      query,
      options,
    );
  }
}
