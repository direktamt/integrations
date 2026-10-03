import type { RawSourceResponse } from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { GetRawOnlineServiceRequest } from '../request/GetRawOnlineServiceRequest.js';
import type { GetRawServiceRequest } from '../request/GetRawServiceRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Raw PVOG representations: the provider's JZuFi 2.3 JSON exactly as
 * delivered, inside the RawSourceResponse envelope. No normalization, no
 * compatibility guarantee for `data`.
 */
export class RawPvogApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /raw/pvog/services/{id}/jzufi-2-3
   */
  getServiceJzufi(
    request: GetRawServiceRequest,
    options?: RequestOptions,
  ): Promise<RawSourceResponse> {
    return this.transport.get(
      `/raw/pvog/services/${segment(request.id)}/jzufi-2-3`,
      {},
      options,
    );
  }

  /**
   * GET /raw/pvog/online-services/{id}/jzufi-2-3
   */
  getOnlineServiceJzufi(
    request: GetRawOnlineServiceRequest,
    options?: RequestOptions,
  ): Promise<RawSourceResponse> {
    return this.transport.get(
      `/raw/pvog/online-services/${segment(request.id)}/jzufi-2-3`,
      {},
      options,
    );
  }
}
