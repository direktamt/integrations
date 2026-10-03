import { AuthorityAddress } from './AuthorityAddress.js';
import { AuthorityContact } from './AuthorityContact.js';

/**
 * A public authority (organisation unit) with the published ways to reach
 * it. Its role is a property of the relation it was resolved through, see
 * ServiceAuthority and OnlineServiceAuthority.
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
