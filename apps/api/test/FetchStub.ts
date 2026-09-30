/**
 * Stand-in for the global `fetch` used by unit tests: records every call and
 * answers with whatever the test configured. Unit tests never reach the
 * network.
 */
export interface RecordedFetchCall {
  url: string;
  init?: RequestInit;
}

export type FetchHandler = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export class FetchStub {
  readonly calls: RecordedFetchCall[] = [];

  private handler: FetchHandler = () =>
    Promise.reject(new Error('FetchStub: no response configured'));

  private readonly originalFetch = global.fetch;

  install(): this {
    const stub = (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      this.calls.push({ url, init });

      return this.handler(url, init);
    };

    global.fetch = stub;

    return this;
  }

  restore(): void {
    global.fetch = this.originalFetch;
  }

  respondWith(handler: FetchHandler): void {
    this.handler = handler;
  }

  respondWithJson(body: unknown, status = 200): void {
    this.respondWith(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  }

  respondWithText(text: string, status = 200): void {
    this.respondWith(() =>
      Promise.resolve(
        new Response(text, {
          status,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );
  }

  /**
   * Rejects once the request is aborted, like a hanging upstream.
   */
  respondNever(): void {
    this.respondWith(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted', 'AbortError')),
          );
        }),
    );
  }

  lastUrl(): URL {
    const last = this.calls[this.calls.length - 1];

    if (!last) {
      throw new Error('FetchStub: no request was made');
    }

    return new URL(last.url);
  }
}
