import { Matches } from 'class-validator';

/**
 * Path parameters of GET /catalog/{serviceCatalogKey}/services.
 */
export class ListCatalogEntryServicesParams {
  /**
   * 14-digit LeiKa key; the upstream hierarchy search accepts nothing else
   * (temporary keys of the form TMP_XX_ included).
   */
  @Matches(/^\d{14}$/, {
    message: 'serviceCatalogKey must be a 14-digit LeiKa key',
  })
  serviceCatalogKey!: string;
}
