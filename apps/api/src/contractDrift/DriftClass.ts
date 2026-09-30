/**
 * Classification of a finding of the upstream contract-drift verification.
 */
export enum DriftClass {
  /**
   * The implemented surface no longer works: error status, redirect to
   * another host, non-JSON body, wire-contract violation (missing required
   * field, wrong type), unusable pagination.
   */
  Breaking = 'BREAKING',

  /**
   * The upstream publishes fields the wire model does not declare; the
   * integration keeps working.
   */
  Additive = 'ADDITIVE',

  /**
   * The endpoint answers with a deprecation header; it still works but is
   * scheduled for removal.
   */
  Deprecated = 'DEPRECATED',

  /**
   * A difference without effect on the integration, e.g. a 2xx status other
   * than 200.
   */
  Cosmetic = 'COSMETIC',

  /**
   * No conclusive answer: no network, timeouts, upstream 5xx or 429 on every
   * attempt. Not contract drift.
   */
  InfrastructureFailure = 'INFRASTRUCTURE_FAILURE',
}
