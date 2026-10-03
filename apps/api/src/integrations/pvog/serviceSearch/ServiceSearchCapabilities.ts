import { ServiceSearchOptions } from '../model/ServiceSearchOptions';

/**
 * What a service-search adapter can honour. Every adapter declares it and
 * GovDataFacade checks it before a search runs: an option the configured
 * adapter cannot honour is rejected (400), never silently dropped, so that
 * GET /services keeps one semantics whatever the upstream version.
 */
export interface ServiceSearchCapabilities {
  /**
   * Largest page size served; an adapter that loads every hit separately
   * keeps this small.
   */
  maxPageSize: number;

  /**
   * Whether fuzzy matching can be switched off (`fuzzySearch=false`).
   */
  supportsExactSearch: boolean;

  /**
   * Whether `validDate` filters by validity date.
   */
  supportsValidDate: boolean;
}

/**
 * Problems with the options under the given capabilities, worded like the
 * request-validation messages; empty when every option can be honoured.
 */
export function findUnsupportedServiceSearchOptions(
  options: ServiceSearchOptions,
  capabilities: ServiceSearchCapabilities,
): string[] {
  const problems: string[] = [];

  if (options.size > capabilities.maxPageSize) {
    problems.push(
      `size must not be greater than ${capabilities.maxPageSize} with the configured service search`,
    );
  }
  if (!options.fuzzySearch && !capabilities.supportsExactSearch) {
    problems.push(
      'fuzzySearch must be true with the configured service search; it always matches fuzzily',
    );
  }
  if (options.validDate !== undefined && !capabilities.supportsValidDate) {
    problems.push(
      'validDate is not supported by the configured service search; validity is evaluated at request time',
    );
  }

  return problems;
}
