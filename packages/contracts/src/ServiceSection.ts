import { ServiceSectionLink } from './ServiceSectionLink';
import { ServiceSectionType } from './ServiceSectionType';

/**
 * One content section of a service description.
 */
export interface ServiceSection {
  /**
   * Semantic type derived from the original title; Other when unknown.
   */
  type: ServiceSectionType;

  /**
   * Original section title as published by the authority.
   */
  originalTitle?: string;

  /**
   * HTML free text as published by the authority; sanitize before rendering.
   */
  htmlText?: string;

  /**
   * Links published inside the section (forms, online services, laws).
   */
  links: ServiceSectionLink[];
}
