import { AuthorityAddressType } from './AuthorityAddressType';

/**
 * A postal or visiting address of an authority.
 */
export interface AuthorityAddress {
  /**
   * Kind of address; Other when the upstream code is unknown.
   */
  type: AuthorityAddressType;

  street?: string;

  houseNumber?: string;

  postalCode?: string;

  city?: string;

  /**
   * Post-office box, usually on postal addresses.
   */
  postBox?: string;
}
