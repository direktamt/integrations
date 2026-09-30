import { IntegrationException } from './IntegrationException';

/**
 * The upstream government API did not answer within the client timeout.
 */
export class UpstreamTimeoutException extends IntegrationException {
  constructor(
    url: string,
    readonly timeoutMs: number,
  ) {
    super(url, `Upstream did not respond within ${timeoutMs} ms for ${url}`);
  }
}
