import { ServiceSection } from './ServiceSection';

/**
 * One public service as described for a territory.
 */
export interface PublicServiceDescription {
  /**
   * PVOG-internal id of the service description.
   */
  id?: string;

  /**
   * LeiKa keys — canonical 14-digit service identifiers.
   */
  serviceCatalogKeys: string[];

  /**
   * Service name; often empty — the name may live in a ServiceName section.
   */
  title?: string;

  /**
   * Short plain-text summary of the service.
   */
  summary?: string;

  /**
   * ARS keys of the territories this description applies to.
   */
  regionalKeys: string[];

  /**
   * Content sections: requirements, documents, fees, ...
   */
  sections: ServiceSection[];
}
