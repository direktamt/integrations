/**
 * How a service description relates to the service catalog key (LeiKa key)
 * it was looked up with, as reported by the official hierarchy search.
 */
export enum ServiceCatalogKeyMatchType {
  /**
   * The description carries the requested key. For nationwide keys the
   * two-digit address-space prefix is ignored upstream, so the description
   * may carry the same key under another prefix.
   */
  Exact = 'EXACT',

  /**
   * No description of the territory carries the requested key; the
   * description carries a more specific key of the catalog hierarchy (a
   * refined variant of the service) or, when none exists, a more general
   * one. Its serviceCatalogKeys show which key it carries.
   */
  Hierarchy = 'HIERARCHY',
}
