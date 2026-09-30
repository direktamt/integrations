/**
 * A resolved territory with its official keys.
 *
 * Represents the territory (ARS level), not a point: upstream returns
 * district-level records and `distinctBy=ARS` keeps an arbitrary
 * representative, so point-level fields (postal code, coordinates,
 * district name) would be misleading and are deliberately not exposed.
 */
export interface Location {
  /**
   * ARS — official 12-digit territory key (state → district → municipality).
   */
  regionalKey: string;

  /**
   * ARS of the federal state the territory belongs to.
   */
  federalStateKey: string;

  /**
   * Name of the territory, e.g. "Bonn".
   */
  name: string;
}
