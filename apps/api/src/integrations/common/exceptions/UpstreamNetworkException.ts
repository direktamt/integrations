import { IntegrationException } from './IntegrationException';

/**
 * No HTTP response at all: DNS failure, connection refused/reset, TLS error.
 */
export class UpstreamNetworkException extends IntegrationException {
  constructor(url: string, cause: unknown) {
    super(
      url,
      `Request to upstream failed before a response was received: ${url}`,
    );

    this.cause = cause;
  }
}
