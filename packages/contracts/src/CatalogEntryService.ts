import { PublicServiceDescription } from './PublicServiceDescription.js';
import { ServiceCatalogKeyMatchType } from './ServiceCatalogKeyMatchType.js';

/**
 * A service description a territory publishes for a federal service catalog
 * key (LeiKa key), with how its key relates to the requested one.
 */
export interface CatalogEntryService {
  /**
   * Exact key or a related key of the catalog hierarchy.
   */
  matchType: ServiceCatalogKeyMatchType;

  /**
   * The service description as published, with all content sections;
   * regionalKeys are the territories of the publishing authority (the
   * requested territory or a parent such as the federal state).
   */
  service: PublicServiceDescription;
}
