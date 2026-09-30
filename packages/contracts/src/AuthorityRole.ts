/**
 * Role an authority plays for a service within a territory, derived from
 * the XZuFi responsibility-role code list; Other when the code is unknown.
 */
export enum AuthorityRole {
  /**
   * The office that is locally and factually responsible for the service.
   */
  ResponsibleAuthority = 'RESPONSIBLE_AUTHORITY',

  /**
   * A point of contact for citizens or businesses, not the deciding office.
   */
  ContactPoint = 'CONTACT_POINT',

  /**
   * Responsible office and point of contact at the same time.
   */
  ResponsibleAuthorityAndContactPoint = 'RESPONSIBLE_AUTHORITY_AND_CONTACT_POINT',

  /**
   * Single point of contact under the EU Services Directive.
   */
  SinglePointOfContact = 'SINGLE_POINT_OF_CONTACT',

  /**
   * Another kind of single point of contact.
   */
  OtherSinglePointOfContact = 'OTHER_SINGLE_POINT_OF_CONTACT',

  Other = 'OTHER',
}
