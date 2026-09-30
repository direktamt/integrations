/**
 * Role an authority plays in a responsibility relation — for a service
 * within a territory or for an online service — derived from the XZuFi
 * responsibility-role vocabulary; Other when the upstream value is unknown.
 */
export enum AuthorityRole {
  /**
   * The office that is locally and factually responsible.
   */
  ResponsibleAuthority = 'RESPONSIBLE_AUTHORITY',

  /**
   * A point of contact for citizens or businesses, not the deciding office.
   */
  ContactPoint = 'CONTACT_POINT',

  /**
   * Responsible office and point of contact at the same time (published as
   * one role by service descriptions).
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

  /**
   * Subject-matter contact for an online service.
   */
  ProfessionalPointOfContact = 'PROFESSIONAL_POINT_OF_CONTACT',

  /**
   * Technical contact for an online service.
   */
  TechnicalPointOfContact = 'TECHNICAL_POINT_OF_CONTACT',

  /**
   * Technical contact for the platform an online service runs on.
   */
  TechnicalContactForOperatingPlatform = 'TECHNICAL_CONTACT_FOR_OPERATING_PLATFORM',

  Other = 'OTHER',
}
