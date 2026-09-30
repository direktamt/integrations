import { AuthorityAddress } from './AuthorityAddress';
import { AuthorityContact } from './AuthorityContact';
import { AuthorityRole } from './AuthorityRole';

/**
 * A public authority (organisation unit) responsible for a service within a
 * territory, with the published ways to reach it.
 */
export interface PublicAuthority {
  /**
   * PVOG-internal id of the organisation unit.
   */
  id: string;

  /**
   * Name of the authority as published.
   */
  name?: string;

  /**
   * Role the authority plays for the requested service in the territory.
   */
  role: AuthorityRole;

  /**
   * Visiting and postal addresses.
   */
  addresses: AuthorityAddress[];

  /**
   * Phone numbers, e-mail addresses and other contact channels.
   */
  contacts: AuthorityContact[];

  /**
   * Published web addresses of the authority, de-duplicated.
   */
  websites: string[];
}
