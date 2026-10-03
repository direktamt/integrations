/**
 * The subset of `fetch` the client relies on; any implementation with this
 * shape works (browser, Node, a test stub, a tracing wrapper).
 */
export type FetchLike = (
  input: string,
  init: {
    method: 'GET';
    headers: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<Response>;

export interface DirektAmtClientOptions {
  /**
   * Origin (and optional path prefix) of the integrations API, e.g.
   * `http://localhost:3000`.
   */
  baseUrl: string;

  /**
   * Fetch implementation; defaults to the global `fetch`.
   */
  fetch?: FetchLike;

  /**
   * Headers sent with every request, e.g. a correlation id. Per-request
   * headers override them.
   */
  headers?: Record<string, string>;
}
