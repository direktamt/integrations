import { CatalogEntry } from './CatalogEntry.js';

/**
 * Result page of a catalog search.
 */
export interface CatalogSearchResult {
  /**
   * Catalog entries on this page.
   */
  entries: CatalogEntry[];

  /**
   * Offset the page starts at.
   */
  offset: number;

  /**
   * Requested page size.
   */
  limit: number;

  /**
   * Number of items on this page.
   */
  count: number;

  /**
   * Total matches across all pages.
   */
  totalCount: number;
}
