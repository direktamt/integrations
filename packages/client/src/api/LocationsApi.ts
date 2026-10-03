import type {
  Location,
  LocationSuggestion,
} from '@direktamt/integrations-contracts';
import { HttpTransport, segment } from '../HttpTransport.js';
import type { GetLocationRequest } from '../request/GetLocationRequest.js';
import type { ResolveLocationRequest } from '../request/ResolveLocationRequest.js';
import type { SuggestLocationsRequest } from '../request/SuggestLocationsRequest.js';
import type { RequestOptions } from '../RequestOptions.js';

/**
 * Territories: autocomplete, resolution of a city or postal code to regional
 * keys, and reverse lookup of a regional key.
 */
export class LocationsApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * GET /locations/suggestions — autocomplete for a city, district or
   * postal code.
   */
  suggest(
    request: SuggestLocationsRequest,
    options?: RequestOptions,
  ): Promise<LocationSuggestion[]> {
    return this.transport.get('/locations/suggestions', request, options);
  }

  /**
   * GET /locations — territories matching a city name or postal code.
   */
  resolve(
    request: ResolveLocationRequest,
    options?: RequestOptions,
  ): Promise<Location[]> {
    return this.transport.get('/locations', request, options);
  }

  /**
   * GET /locations/{regionalKey} — one territory; 404 when unknown.
   */
  get(
    request: GetLocationRequest,
    options?: RequestOptions,
  ): Promise<Location> {
    return this.transport.get(
      `/locations/${segment(request.regionalKey)}`,
      {},
      options,
    );
  }
}
