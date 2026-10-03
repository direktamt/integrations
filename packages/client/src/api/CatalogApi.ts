import type {
  CatalogEntry,
  CatalogSearchResult,
} from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { GetCatalogEntryRequest } from '../request/GetCatalogEntryRequest.js';
import type { SearchCatalogRequest } from '../request/SearchCatalogRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Federal LeiKa service catalog.
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
}
