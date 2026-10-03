export interface SearchCatalogRequest {
  /**
   * Search term for the federal service catalog.
   */
  term: string;

  /**
   * Maximum number of results, 1 to 200.
   */
  limit?: number;

  /**
   * Number of results to skip.
   */
  offset?: number;
}
