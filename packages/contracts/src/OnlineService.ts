import { ServiceSectionLink } from './ServiceSectionLink';

/**
 * An online application service (direct submission).
 */
export interface OnlineService {
  /**
   * PVOG-internal id of the online service.
   */
  id?: string;

  /**
   * Name of the online application as published.
   */
  name?: string;

  /**
   * Optional description of what can be applied for.
   */
  description?: string;

  /**
   * LeiKa keys of the services this application covers.
   */
  serviceCatalogKeys: string[];

  /**
   * Entry links to the online application.
   */
  links: ServiceSectionLink[];

  /**
   * Last-change timestamp in the publishing source system.
   */
  lastUpdatedAt?: string;
}
