import { DirektAmtApiError } from './DirektAmtApiError.js';
import type {
  DirektAmtClientOptions,
  FetchLike,
} from './DirektAmtClientOptions.js';
import { serializeQuery, type QueryShape } from './QuerySerializer.js';
import type { RequestOptions } from './RequestOptions.js';

/**
 * Internal GET transport shared by the API groups: URL building, header
 * merging, the fetch call, JSON parsing and the typed error.
 */
export class HttpTransport {
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly headers: Record<string, string>;

  constructor(options: DirektAmtClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.headers = { ...options.headers };
  }

  /**
   * @param path absolute API path with already encoded segments
   */
  async get<T, Q extends QueryShape<Q> = Record<string, never>>(
    path: string,
    query: Q = {} as Q,
    options: RequestOptions = {},
  ): Promise<T> {
    const search = serializeQuery(query);
    const url = `${this.baseUrl}${path}${search ? `?${search}` : ''}`;
    const request = `GET ${path}`;

    const response = await this.fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...this.headers,
        ...options.headers,
      },
      signal: options.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      throw DirektAmtApiError.fromResponse(response.status, text, request);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new DirektAmtApiError({
        status: response.status,
        code: 'MALFORMED_RESPONSE',
        message: `${request} answered HTTP ${response.status} with a body that is not JSON`,
        responseBody: text,
      });
    }
  }
}

/**
 * Encodes one path segment; ids such as `L100002.LB.1` stay readable,
 * anything that could change the path is escaped.
 */
export function segment(value: string): string {
  return encodeURIComponent(value);
}
