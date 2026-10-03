import { AuthorityContactType } from './AuthorityContactType.js';

/**
 * One contact channel of an authority (phone number, e-mail address, ...).
 */
export interface AuthorityContact {
  /**
   * Normalized channel; Other when the upstream code has no dedicated type.
   */
  type: AuthorityContactType;

  /**
   * The number, address or URL as published.
   */
  value: string;

  /**
   * Channel label as published by the authority, e.g. "Telefon Festnetz".
   */
  label?: string;

  /**
   * Explanatory text published next to the value.
   */
  description?: string;
}
