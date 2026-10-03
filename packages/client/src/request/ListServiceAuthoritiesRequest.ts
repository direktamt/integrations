export interface ListServiceAuthoritiesRequest {
  /**
   * PVOG id of the service description.
   */
  id: string;

  /**
   * Regional key (ARS) the responsibilities are resolved for.
   */
  regionalKey: string;

  /**
   * Include authorities published for parent territories; the API defaults
   * to true, so `false` must be explicit.
   */
  useRegionalHierarchy?: boolean;
}
