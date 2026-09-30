/**
 * Parameters of a service search. Defaults are declared once, at the API
 * boundary (see api/request/SearchServicesQuery);
 * callers therefore pass every non-filter field explicitly.
 */
export interface ServiceSearchOptions {
  /**
   * Page size; the API requires at least 5.
   */
  size: number;

  /**
   * Zero-based page index.
   */
  page: number;

  /**
   * Tolerate typos in the query.
   */
  fuzzySearch: boolean;

  /**
   * Include services published for parent territories (state, federal).
   */
  useRegionalHierarchy: boolean;

  /**
   * Filter by life-situation codes.
   */
  lifeSituationCodes?: string[];

  /**
   * Only descriptions valid at this date (ISO 8601).
   */
  validDate?: string;
}
