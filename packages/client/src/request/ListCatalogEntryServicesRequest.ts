export interface ListCatalogEntryServicesRequest {
  /**
   * 14-digit LeiKa key, e.g. `99115005104000`.
   */
  serviceCatalogKey: string;

  /**
   * 12-digit regional key (ARS) of the territory, ideally a municipality.
   */
  regionalKey: string;
}
