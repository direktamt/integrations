export interface GetServiceRequest {
  /**
   * PVOG id of the service description, e.g. `L100002.LB.121407320`.
   */
  id: string;

  /**
   * Regional key (ARS) the description is requested for.
   */
  regionalKey: string;

  /**
   * Include descriptions published for parent territories; the API
   * defaults to true, so `false` must be explicit.
   */
  useRegionalHierarchy?: boolean;
}
