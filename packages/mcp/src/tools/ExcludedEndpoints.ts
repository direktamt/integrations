/**
 * A public endpoint deliberately left without a tool.
 */
export interface ExcludedEndpoint {
  endpoint: string;
  reason: string;
}

/**
 * Public endpoints without a tool. The coverage check fails for every other
 * endpoint without one, and for an entry here that is no public endpoint
 * any more or has a tool after all.
 */
export const EXCLUDED_ENDPOINTS: readonly ExcludedEndpoint[] = [
  {
    endpoint: 'GET /raw/pvog/services/{id}/jzufi-2-3',
    reason:
      'Raw provider document without normalisation or compatibility guarantee; the normalised service tools cover its content.',
  },
  {
    endpoint: 'GET /raw/pvog/online-services/{id}/jzufi-2-3',
    reason:
      'Raw provider document without normalisation or compatibility guarantee; the normalised online-service tools cover its content.',
  },
  {
    endpoint: 'GET /health',
    reason:
      'Operational liveness probe for container platforms and load balancers; it returns no integration data.',
  },
];
