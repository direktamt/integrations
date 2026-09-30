import { IntegrationException } from './IntegrationException';

/**
 * The upstream government API answered with a non-2xx status code.
 */
export class UpstreamHttpException extends IntegrationException {
  constructor(
    url: string,
    readonly status: number,
    readonly bodySnippet?: string,
  ) {
    super(url, `Upstream responded with HTTP ${status} for ${url}`);
  }
}
