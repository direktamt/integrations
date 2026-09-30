/**
 * One entry of the federal LeiKa service catalog.
 */
export interface CatalogEntry {
  /**
   * LeiKa key — canonical 14-digit service id across Germany.
   */
  serviceCatalogKey: string;

  /**
   * Id of the editorial office maintaining the entry.
   */
  editorialOfficeId: string;

  /**
   * Id of the service within its editorial office.
   */
  serviceId: string;

  /**
   * Catalog title of the service.
   */
  title: string;

  /**
   * Official administrative name.
   */
  officialName?: string;

  /**
   * Citizen-facing name.
   */
  citizenFacingName?: string;

  /**
   * Numeric editorial approval status.
   */
  approvalStatus?: number;

  /**
   * Creation timestamp, ISO 8601.
   */
  createdAt?: string;

  /**
   * Last-modification timestamp, ISO 8601.
   */
  modifiedAt?: string;

  /**
   * LeiKa type codes of the service.
   */
  typeCodes: string[];

  /**
   * Service type identifier.
   */
  serviceType?: string;

  /**
   * Legal basis as free text, one law per line.
   */
  legalBasis?: string;
}
