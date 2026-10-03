export interface SearchServicesRequest {
  /**
   * Regional key (ARS) resolved via the locations group.
   */
  regionalKey: string;

  /**
   * Plain-language description of the task.
   */
  query: string;

  /**
   * Page size, 5 to 9999; the API defaults to 10.
   */
  size?: number;

  /**
   * Zero-based page index, 0 to 100; the API defaults to 0.
   */
  page?: number;

  /**
   * Tolerate typos; the API defaults to true, so `false` must be explicit.
   */
  fuzzySearch?: boolean;

  /**
   * Include services published for parent territories; the API defaults to
   * true, so `false` must be explicit.
   */
  useRegionalHierarchy?: boolean;

  /**
   * Life-situation codes to filter by.
   */
  lifeSituationCodes?: string[];

  /**
   * Only descriptions valid at this date, ISO 8601 (`yyyy-MM-dd`).
   */
  validDate?: string;
}
