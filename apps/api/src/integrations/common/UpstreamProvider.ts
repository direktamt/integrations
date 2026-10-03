/**
 * External data sources behind the integration layer. Resilience state
 * (circuit breaker) is kept per provider, not per endpoint.
 */
export type UpstreamProvider = 'PVOG' | 'FIM';
