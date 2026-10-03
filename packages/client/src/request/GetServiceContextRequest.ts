export interface GetServiceContextRequest {
  /**
   * PVOG id of the service description.
   */
  id: string;

  /**
   * Regional key (ARS) the service, its authorities and online services are
   * resolved for.
   */
  regionalKey: string;

  /**
   * Include data published for parent territories; the API defaults to
   * true, so `false` must be explicit.
   */
  useRegionalHierarchy?: boolean;
}
