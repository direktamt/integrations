import type {
  OnlineServiceAuthority,
  ServiceAuthority,
} from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { ListOnlineServiceAuthoritiesRequest } from '../request/ListOnlineServiceAuthoritiesRequest.js';
import type { ListServiceAuthoritiesRequest } from '../request/ListServiceAuthoritiesRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Authorities (organisation units) responsible for a service or an online
 * service, with their roles, addresses and contact channels.
 */
export class AuthoritiesApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /services/{id}/authorities — authorities responsible for a service
   * within a territory.
   */
  listForService(
    request: ListServiceAuthoritiesRequest,
    options?: RequestOptions,
  ): Promise<ServiceAuthority[]> {
    const { id, ...query } = request;

    return this.transport.get(
      `/services/${segment(id)}/authorities`,
      query,
      options,
    );
  }

  /**
   * GET /online-services/{id}/authorities — authorities responsible for an
   * online service.
   */
  listForOnlineService(
    request: ListOnlineServiceAuthoritiesRequest,
    options?: RequestOptions,
  ): Promise<OnlineServiceAuthority[]> {
    return this.transport.get(
      `/online-services/${segment(request.id)}/authorities`,
      {},
      options,
    );
  }
}
