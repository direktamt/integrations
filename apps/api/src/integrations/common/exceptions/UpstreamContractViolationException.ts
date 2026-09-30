import { IntegrationException } from './IntegrationException';

/**
 * 2xx answer whose body does not match the integration's wire model — contract drift.
 */
export class UpstreamContractViolationException extends IntegrationException {
  constructor(
    url: string,
    readonly violations: string[],
  ) {
    const preview = violations.slice(0, 5).join('; ');

    const suffix =
      violations.length > 5 ? ` (+${violations.length - 5} more)` : '';

    super(
      url,
      `Upstream response violates the wire contract for ${url}: ${preview}${suffix}`,
    );
  }
}
