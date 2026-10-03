export interface ListOnlineServicesRequest {
  /**
   * Regional key (ARS) of the territory.
   */
  regionalKey: string;

  /**
   * LeiKa service catalog keys to filter by.
   */
  serviceCatalogKeys?: string[];
}
