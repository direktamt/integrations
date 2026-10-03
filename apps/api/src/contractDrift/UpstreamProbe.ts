import type { ClassConstructor } from 'class-transformer';

import type { UpstreamProvider } from '../integrations/common/UpstreamProvider';

export type { UpstreamProvider };

export enum ProbeKind {
  /**
   * Structured endpoint: the body must transform into the wire model and
   * pass class-validator.
   */
  Wire = 'wire',

  /**
   * Raw or dynamic endpoint: only status and JSON parseability are checked.
   */
  Raw = 'raw',
}

/**
 * How a paginated endpoint exposes its cursor.
 */
export interface ProbePagination {
  /**
   * Body field holding the next-page cursor; empty string on the last page.
   */
  tokenField: string;

  /**
   * Query parameter the cursor is sent with.
   */
  tokenParameter: string;

  /**
   * Upper bound on pages followed by the probe.
   */
  maxPages: number;
}

/**
 * One reference request against an implemented upstream endpoint. Reference
 * requests are read-only, use well-known public administrative identifiers
 * and ask for the smallest useful result.
 */
export interface UpstreamProbe {
  provider: UpstreamProvider;

  /**
   * Endpoint as documented in the handbook, e.g. `GET /v3/locations/ars`.
   */
  endpoint: string;

  /**
   * Handbook section documenting the endpoint.
   */
  handbookSection: string;

  /**
   * Complete request URL.
   */
  url: string;

  kind: ProbeKind;

  /**
   * Wire model the body (or each array item) must satisfy; Wire probes only.
   */
  wireModel?: ClassConstructor<object>;

  /**
   * Whether the body is a JSON array of wire-model items.
   */
  expectsArray?: boolean;

  /**
   * The upstream's own instability statement for a Raw probe, repeated in
   * the finding so that nobody expects a stable shape.
   */
  instability?: string;

  pagination?: ProbePagination;

  /**
   * Upstream fields the wire model deliberately does not declare (documented
   * in the handbook as not consumed), as index-normalized paths such as
   * `serviceDescriptions.content[].teaser`. They are not reported as
   * additive drift; anything else undeclared is.
   */
  knownUndeclaredFields?: string[];
}
