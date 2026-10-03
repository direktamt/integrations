import type { OnlineService } from '@direktamt/integrations-contracts';
import { HttpTransport } from '../HttpTransport.js';
import type { ListOnlineServicesRequest } from '../request/ListOnlineServicesRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Online-application links of a territory.
 */
export class OnlineServicesApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /online-services — all online services of a territory, optionally
   * filtered by LeiKa keys; the API collects every upstream page.
   */
  list(
    request: ListOnlineServicesRequest,
    options?: RequestOptions,
  ): Promise<OnlineService[]> {
    return this.transport.get('/online-services', request, options);
  }
}
