/**
 * Contact channel of an authority, derived from the XÖV "Erreichbarkeit"
 * code list; Other for channels without a dedicated type (messengers,
 * social networks, contact forms, ...).
 */
export enum AuthorityContactType {
  Email = 'EMAIL',

  /**
   * Landline or mobile phone number.
   */
  Phone = 'PHONE',

  Fax = 'FAX',

  /**
   * Web address published as a contact channel.
   */
  Web = 'WEB',

  Other = 'OTHER',
}
