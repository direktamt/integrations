import type {
  PublicServiceDescription,
  ServiceContext,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { GetServiceContextRequest } from '../request/GetServiceContextRequest.js';
import type { GetServiceRequest } from '../request/GetServiceRequest.js';
import type { SearchServicesRequest } from '../request/SearchServicesRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Public services within a territory: search, one description, and the
 * composed context of one service.
 */
export class ServicesApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /services — plain-language search within a territory.
   */
  search(
    request: SearchServicesRequest,
    options?: RequestOptions,
  ): Promise<ServiceSearchResult> {
    return this.transport.get('/services', request, options);
  }

  /**
   * GET /services/{id} — one service description with all sections; 404
   * when the service does not exist in the territory.
   */
  get(
    request: GetServiceRequest,
    options?: RequestOptions,
  ): Promise<PublicServiceDescription> {
    const { id, ...query } = request;

    return this.transport.get(`/services/${segment(id)}`, query, options);
  }

  /**
   * GET /services/{id}/context — the service with its authorities, online
   * services, catalog entries and master texts in one response; check
   * `status.unavailableParts` for parts whose upstream failed.
   */
  getContext(
    request: GetServiceContextRequest,
    options?: RequestOptions,
  ): Promise<ServiceContext> {
    const { id, ...query } = request;

    return this.transport.get(
      `/services/${segment(id)}/context`,
      query,
      options,
    );
  }
}
