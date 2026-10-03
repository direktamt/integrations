import type { ParsedMasterText } from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { GetMasterTextRequest } from '../request/GetMasterTextRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Federal master texts (parsed XZuFi) of the FIM Portal; an unvalidated
 * pass-through whose shape the operator declares unstable.
 */
export class MasterTextsApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /master-texts/{editorialOfficeId}/{serviceId} — 404 when the pair
   * has no master text.
   */
  get(
    request: GetMasterTextRequest,
    options?: RequestOptions,
  ): Promise<ParsedMasterText> {
    const { editorialOfficeId, serviceId, ...query } = request;

    return this.transport.get(
      `/master-texts/${segment(editorialOfficeId)}/${segment(serviceId)}`,
      query,
      options,
    );
  }
}
