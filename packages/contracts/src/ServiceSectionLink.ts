/**
 * A link published inside a service-description section.
 */
export interface ServiceSectionLink {
  /**
   * Target URL.
   */
  url?: string;

  /**
   * Link text as published by the authority.
   */
  title?: string;

  /**
   * Optional explanatory text next to the link.
   */
  description?: string;
}
