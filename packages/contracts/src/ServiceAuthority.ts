import { AuthorityRole } from './AuthorityRole.js';
import { PublicAuthority } from './PublicAuthority.js';

/**
 * An authority responsible for a service within a territory, with the role
 * it plays for that service.
 */
export interface ServiceAuthority {
  authority: PublicAuthority;

  /**
   * Role for the requested service and territory.
   */
  role: AuthorityRole;
}
