import { Matches } from 'class-validator';

/**
 * Query parameters of GET /catalog/{serviceCatalogKey}/services.
 */
export class ListCatalogEntryServicesQuery {
  /**
   * 12-digit regional key (ARS) of the territory, ideally a municipality;
   * descriptions of parent territories (state, federal) are included.
   */
  @Matches(/^\d{12}$/, {
    message: 'regionalKey must be a 12-digit regional key (ARS)',
  })
  regionalKey!: string;
}
