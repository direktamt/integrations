import { IntegrationException } from './IntegrationException';

/**
 * The upstream government API answered with a non-2xx status code.
 */
export class UpstreamHttpException extends IntegrationException {
  /**
   * @param retryAfterMs delay requested by a valid `Retry-After` header,
   * when the upstream sent one.
   */
  constructor(
    url: string,
    readonly status: number,
    readonly bodySnippet?: string,
    readonly retryAfterMs?: number,
  ) {
    super(url, `Upstream responded with HTTP ${status} for ${url}`);
  }
}
