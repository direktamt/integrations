import { PublicServiceDescription } from './PublicServiceDescription.js';

/**
 * Result page of a service search.
 */
export interface ServiceSearchResult {
  /**
   * Services on this page.
   */
  services: PublicServiceDescription[];

  /**
   * Total matches across all pages.
   */
  totalElements?: number;

  /**
   * Total number of pages.
   */
  totalPages?: number;
}
