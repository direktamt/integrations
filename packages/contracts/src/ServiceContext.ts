import { CatalogEntry } from './CatalogEntry';
import { OnlineService } from './OnlineService';
import { ParsedMasterText } from './ParsedMasterText';
import { PublicAuthority } from './PublicAuthority';
import { PublicServiceDescription } from './PublicServiceDescription';
import { ServiceContextStatus } from './ServiceContextStatus';

/**
 * Everything the integration layer knows about one public service within a
 * territory, composed from PVOG and FIM along the published identifier
 * relations (service → LeiKa keys → online services, catalog entries →
 * master texts).
 */
export interface ServiceContext {
  /**
   * The service description itself; the request fails with 404 when the
   * service does not exist in the territory.
   */
  service: PublicServiceDescription;

  /**
   * Authorities responsible for the service in the territory (PVOG).
   */
  authorities: PublicAuthority[];

  /**
   * Online-application links published for the service's catalog keys in
   * the territory (PVOG); empty when the service carries no catalog key.
   */
  onlineServices: OnlineService[];

  /**
   * Federal catalog entries of the service's catalog keys (FIM); keys the
   * catalog does not know are skipped.
   */
  catalogEntries: CatalogEntry[];

  /**
   * Parsed federal master texts of the catalog entries (FIM, primary
   * source), one per distinct editorial office and service id; entries
   * without a published master text are skipped.
   */
  masterTexts: ParsedMasterText[];

  /**
   * Which parts could not be loaded.
   */
  status: ServiceContextStatus;
}
