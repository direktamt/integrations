/**
 * At least one of the two criteria is required.
 */
export interface ResolveLocationRequest {
  /**
   * Full city name, e.g. "Bonn".
   */
  cityName?: string;

  /**
   * German postal code, e.g. "53111".
   */
  postalCode?: string;
}
