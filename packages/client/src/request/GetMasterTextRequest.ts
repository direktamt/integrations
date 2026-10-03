export interface GetMasterTextRequest {
  /**
   * Editorial office id from a catalog entry, e.g. `B100019`.
   */
  editorialOfficeId: string;

  /**
   * Service id within the editorial office, from a catalog entry.
   */
  serviceId: string;

  /**
   * Upstream text source variant; the API defaults to `primary`.
   */
  source?: string;
}
