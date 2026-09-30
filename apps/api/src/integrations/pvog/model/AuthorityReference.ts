import type { AuthorityRole } from '@direktamt/integrations-contracts';

/**
 * Integration-only: an organisation unit a service description names as
 * responsible, as delivered by the PVOG service detail. The unit's contact
 * data is loaded separately (PvogAuthorityClient).
 */
export interface AuthorityReference {
  /**
   * PVOG-internal id of the organisation unit.
   */
  id: string;

  /**
   * Name of the unit as listed with the service.
   */
  name?: string;

  /**
   * Role of the unit for the service in the requested territory.
   */
  role: AuthorityRole;
}
