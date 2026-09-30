import type { AuthorityRole } from '@direktamt/integrations-contracts';
import { AuthorityReference } from './AuthorityReference';

/**
 * Integration-only: an organisation unit responsible for an online service,
 * with its distinct roles for it.
 */
export interface OnlineServiceAuthorityReference extends AuthorityReference {
  roles: AuthorityRole[];
}
