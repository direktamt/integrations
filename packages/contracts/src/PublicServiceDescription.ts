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
   * absent (undefined) when the upstream endpoint does not deliver the
   * field at all, as the detail endpoint does not.
   */
  federalStateKeys?: string[];

  /**
   * Who the service is meant for, as published (e.g. citizens, businesses).
   * Published with search results; an empty list means the authority did
   * not classify the service, absent (undefined) means the upstream
   * endpoint does not deliver the field at all (detail endpoint, v8beta1
   * search).
   */
  targetAudiences?: string[];

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
