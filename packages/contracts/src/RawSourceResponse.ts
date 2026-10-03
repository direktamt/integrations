import { JsonValue } from './JsonValue.js';

/**
 * Envelope of a raw provider representation. `data` is the upstream body
 * exactly as parsed — provider-specific field names included — and carries
 * no DirektAmt compatibility guarantee; only the envelope is stable.
 */
export interface RawSourceResponse {
  /**
   * Upstream system the body was fetched from.
   */
  provider: 'PVOG';

  /**
   * Representation the upstream delivered: JZuFi is the JSON form of the
   * XZuFi standard, here version 2.3.
   */
  representation: 'jzufi-2-3';

  /**
   * The parsed upstream body, unmodified.
   */
  data: JsonValue;
}
