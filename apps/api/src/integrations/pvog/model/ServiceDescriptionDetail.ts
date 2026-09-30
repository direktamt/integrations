import type { PublicServiceDescription } from '@direktamt/integrations-contracts';
import { ServiceAuthorityReference } from './ServiceAuthorityReference';

/**
 * Integration-only: one PVOG service detail response split into the public
 * service description and the references it carries, so that one upstream
 * call can serve both the description and the authority composition.
 */
export interface ServiceDescriptionDetail {
  service: PublicServiceDescription;

  /**
   * Organisation units responsible for the service, in upstream order.
   */
  authorityReferences: ServiceAuthorityReference[];
}
