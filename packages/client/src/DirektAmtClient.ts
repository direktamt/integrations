import { AuthoritiesApi } from './api/AuthoritiesApi.js';
import { CatalogApi } from './api/CatalogApi.js';
import { LocationsApi } from './api/LocationsApi.js';
import { MasterTextsApi } from './api/MasterTextsApi.js';
import { OnlineServicesApi } from './api/OnlineServicesApi.js';
import { RawApi } from './api/RawApi.js';
import { ServicesApi } from './api/ServicesApi.js';
import type { DirektAmtClientOptions } from './DirektAmtClientOptions.js';
import { HttpTransport } from './HttpTransport.js';

/**
 * Typed client for the DirektAmt integrations API. One instance per base
 * URL; every method returns the shared response contracts and throws
 * DirektAmtApiError for non-2xx answers.
 *
 * ```ts
 * const client = new DirektAmtClient({ baseUrl: 'http://localhost:3000' });
 * const [territory] = await client.locations.resolve({ cityName: 'Bonn' });
 * const result = await client.services.search({
 *   regionalKey: territory.regionalKey,
 *   query: 'Wohnsitz anmelden',
 * });
 * ```
 */
export class DirektAmtClient {
  readonly locations: LocationsApi;
  readonly services: ServicesApi;
  readonly authorities: AuthoritiesApi;
  readonly onlineServices: OnlineServicesApi;
  readonly catalog: CatalogApi;
  readonly masterTexts: MasterTextsApi;
  readonly raw: RawApi;

  constructor(options: DirektAmtClientOptions) {
    const transport = new HttpTransport(options);

    this.locations = new LocationsApi(transport);
    this.services = new ServicesApi(transport);
    this.authorities = new AuthoritiesApi(transport);
    this.onlineServices = new OnlineServicesApi(transport);
    this.catalog = new CatalogApi(transport);
    this.masterTexts = new MasterTextsApi(transport);
    this.raw = new RawApi(transport);
  }
}
