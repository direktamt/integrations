import type { AuthorityRole } from '@direktamt/integrations-contracts';
import { AuthorityReference } from './AuthorityReference';

/**
 * Integration-only: an organisation unit a service description names as
 * responsible, with its role for the service in the requested territory.
 */
export interface ServiceAuthorityReference extends AuthorityReference {
  role: AuthorityRole;
}
