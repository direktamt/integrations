/**
 * Integration-only: the service and territory an organisation unit is
 * resolved for. PVOG's organisation-unit detail refines the unit's role and
 * filters its contact persons and forms by `lbId` and `ars`; without the
 * scope it answers the unit's general card, which is what a relation
 * without a service context (online services) gets.
 */
export interface AuthorityDetailScope {
  /**
   * PVOG-internal id of the service description (`lbId`).
   */
  serviceId: string;

  /**
   * Regional key (ARS) of the territory.
   */
  regionalKey: string;
}
