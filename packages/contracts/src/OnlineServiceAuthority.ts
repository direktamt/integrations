import { AuthorityRole } from './AuthorityRole.js';
import { PublicAuthority } from './PublicAuthority.js';

/**
 * An authority responsible for an online service, with every role it plays
 * for it (one online service may cover several services, and an authority
 * may be responsible office and point of contact at once).
 */
export interface OnlineServiceAuthority {
  authority: PublicAuthority;

  /**
   * Distinct roles in upstream order.
   */
  roles: AuthorityRole[];
}
