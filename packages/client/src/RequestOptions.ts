/**
 * Per-request options; every client method accepts them as the last
 * argument.
 */
export interface RequestOptions {
  /**
   * Aborts the underlying request; the returned promise rejects with the
   * abort error of the fetch implementation.
   */
  signal?: AbortSignal;

  /**
   * Headers for this request only, merged over the client defaults.
   */
  headers?: Record<string, string>;
}
