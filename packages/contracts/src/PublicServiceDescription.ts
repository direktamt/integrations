import { ServiceSection } from './ServiceSection.js';

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
   * Keys of the federal states the territories belong to (first two ARS
   * digits; "00" for federal descriptions). Published with search results;
   * the detail endpoint does not deliver them, so the list is empty there.
   */
  federalStateKeys: string[];

  /**
   * Who the service is meant for, as published (e.g. citizens, businesses).
   * Published with search results only; empty when the authority did not
   * classify the service or on the detail endpoint.
   */
  targetAudiences: string[];

  /**
   * Language codes (ISO 639-1) the description is published in; the content
   * itself is delivered in the upstream default language.
   */
  availableLanguages: string[];

  /**
   * Content sections: requirements, documents, fees, ...
   */
  sections: ServiceSection[];
}
