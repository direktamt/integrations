import { HttpTransport } from '../HttpTransport.js';
import { RawPvogApi } from './RawPvogApi.js';

/**
 * Raw provider representations, deliberately separated from the normalized
 * groups: everything under `raw` follows the provider's contract and
 * receives no DirektAmt compatibility guarantee.
 */
export class RawApi {
  readonly pvog: RawPvogApi;

  constructor(transport: HttpTransport) {
    this.pvog = new RawPvogApi(transport);
  }
}
