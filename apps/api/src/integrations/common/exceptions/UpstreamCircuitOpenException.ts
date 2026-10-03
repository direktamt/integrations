import { UpstreamProvider } from '../UpstreamProvider';
import { IntegrationException } from './IntegrationException';

/**
 * The request was not sent: the provider's circuit breaker is open after
 * repeated availability failures and rejects calls until its open period
 * has elapsed and a probe succeeds.
 */
export class UpstreamCircuitOpenException extends IntegrationException {
  constructor(
    url: string,
    readonly provider: UpstreamProvider,
  ) {
    super(
      url,
      `Upstream calls to ${provider} are suspended after repeated failures: ${url}`,
    );
  }
}
