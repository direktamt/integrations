import {
  ServiceCatalogKeyMatchType,
  type CatalogEntryService,
  type Location,
  type LocationSuggestion,
  type OnlineService,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../config';
import { BaseHttpClient } from '../common/BaseHttpClient';
import { UpstreamProvider } from '../common/UpstreamProvider';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
import { ServiceDescriptionDetail } from './model/ServiceDescriptionDetail';
import {
  toAuthorityReference,
  toServiceDescription,
} from './ServiceDescriptionMapper';
import { WireLocationDetails } from './wire/WireLocationDetails';
import { WireLocationSuggestion } from './wire/WireLocationSuggestion';
import { WireOnlineService } from './wire/WireOnlineService';
import { WireOnlineServicesResponse } from './wire/WireOnlineServicesResponse';
import { WireServiceCatalogHierarchyPage } from './wire/WireServiceCatalogHierarchyPage';
import { WireServiceDescription } from './wire/WireServiceDescription';

/**
 * Adapter for the public PVOG Suchdienst API (no authentication): locations,
 * service details, service descriptions by LeiKa key and online services.
 * The service search has its own versioned adapters under serviceSearch/.
 * Docs: GET {baseUrl}/v3/api-docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, section 1.
 */
@Injectable()
export class PvogSearchClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;
  protected readonly provider: UpstreamProvider = 'PVOG';

  /**
   * Technical cap on location matches when the caller sets no limit; guards
   * against an unbounded upstream response.
   */
  private static readonly LOCATION_RESULT_CAP = 10;

  /**
   * Upper bound on upstream pages followed by listOnlineServices; guards
   * against an upstream that keeps producing new page tokens.
   */
  private static readonly MAX_ONLINE_SERVICE_PAGES = 100;

  /**
   * Page size requested from the LeiKa hierarchy search; one key rarely has
   * more than a few dozen descriptions, so one page is the normal case.
   */
  private static readonly CATALOG_ENTRY_SERVICE_PAGE_SIZE = 100;

  /**
   * Pages the LeiKa hierarchy search can serve (page index 0 to 100).
   */
  private static readonly MAX_CATALOG_ENTRY_SERVICE_PAGES = 101;

  /**
   * City / district / postal-code autocomplete.
   */
  async suggestLocations(query: string): Promise<LocationSuggestion[]> {
    const wire = await this.getModelArray(
      WireLocationSuggestion,
      '/v3/locations/suggestions',
      {
        q: query,
      },
    );
    return wire.map((item) => ({ name: item.name, relevance: item.relevance }));
  }

  /**
   * Resolve a city name or postal code to territory data incl. the regional key (ARS).
   */
  async resolveLocation(criteria: {
    cityName?: string;
    postalCode?: string;
    limit?: number;
  }): Promise<Location[]> {
    const wire = await this.getModelArray(
      WireLocationDetails,
      '/v3/locations/details',
      {
        ort: criteria.cityName,
        plz: criteria.postalCode,
        limit: criteria.limit ?? PvogSearchClient.LOCATION_RESULT_CAP,
        distinctBy: ['ARS'],
      },
    );
    return wire.map((item) => this.toLocation(item));
  }

  /**
   * Reverse lookup: regional key (ARS) → territory data. Null when unknown.
   */
  async getLocation(regionalKey: string): Promise<Location | null> {
    const wire = await this.getModelArray(
      WireLocationDetails,
      '/v3/locations/ars',
      {
        ars: regionalKey,
      },
      { cacheable: true },
    );
    return wire.length > 0 ? this.toLocation(wire[0]) : null;
  }

  /**
   * Canonical detail view of one service description within a territory,
   * together with the organisation units it names as responsible (their
   * roles are resolved upstream for the territory and hierarchy setting).
   */
  async getServiceDescription(
    id: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<ServiceDescriptionDetail> {
    const wire = await this.getModel(
      WireServiceDescription,
      `/v6/servicedescriptions/${encodeURIComponent(id)}/detail`,
      {
        ars: regionalKey,
        useArsHierarchy: useRegionalHierarchy,
      },
    );
    return {
      service: toServiceDescription(wire),
      authorityReferences: (wire.authorities ?? []).map((reference) =>
        toAuthorityReference(reference),
      ),
    };
  }

  /**
   * Online application services (direct submission links) for a territory.
   * The upstream endpoint is paginated (`nextPageToken`); this method follows
   * the cursor with the same filters until the last page and returns the
   * complete set. A repeated token or an excessive number of pages is treated
   * as a contract violation instead of looping forever.
   */
  async listOnlineServices(
    regionalKey: string,
    serviceCatalogKeys?: string[],
  ): Promise<OnlineService[]> {
    const path = '/v1beta2/onlineservices';
    const items: WireOnlineService[] = [];
    const seenTokens = new Set<string>();
    let nextPageToken: string | undefined;

    do {
      const page = await this.getModel(WireOnlineServicesResponse, path, {
        ars: regionalKey,
        leikaIds: serviceCatalogKeys,
        nextPageToken,
      });

      items.push(...(page.onlineServices ?? []));
      nextPageToken = page.nextPageToken || undefined;

      if (nextPageToken !== undefined) {
        if (seenTokens.has(nextPageToken)) {
          throw new UpstreamContractViolationException(this.baseUrl + path, [
            'nextPageToken repeated a previously seen value',
          ]);
        }
        if (seenTokens.size >= PvogSearchClient.MAX_ONLINE_SERVICE_PAGES) {
          throw new UpstreamContractViolationException(this.baseUrl + path, [
            `more than ${PvogSearchClient.MAX_ONLINE_SERVICE_PAGES} pages`,
          ]);
        }
        seenTokens.add(nextPageToken);
      }
    } while (nextPageToken !== undefined);

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      serviceCatalogKeys: [
        ...new Set(
          (item.serviceDescriptions ?? []).flatMap(
            (ref) => ref.serviceCatalogKeys ?? [],
          ),
        ),
      ],
      links: (item.links ?? []).map((link) => ({
        url: link.url,
        title: link.title,
        description: link.description,
      })),
      lastUpdatedAt: item.lastUpdatedAt,
    }));
  }

  /**
   * Service descriptions a territory publishes for one LeiKa key, via the
   * upstream LeiKa hierarchy search: descriptions with the exact key first;
   * when there are none, descriptions with more specific keys (refined
   * variants), and when there are none either, with more general keys. The
   * territory is resolved upwards (state, federal descriptions included).
   * Every hit carries the page's exact flag. All pages are collected in
   * upstream order; a total beyond the upstream page limit is treated as a
   * contract violation. Not cached: a search, not a key-based read.
   */
  async listCatalogEntryServices(
    serviceCatalogKey: string,
    regionalKey: string,
  ): Promise<CatalogEntryService[]> {
    const path = '/v2/servicedescriptions/leikahierarchy';
    const services: CatalogEntryService[] = [];
    let page = 0;
    let totalPages = 1;

    do {
      const wire = await this.getModel(WireServiceCatalogHierarchyPage, path, {
        leikaIds: [serviceCatalogKey],
        ars: regionalKey,
        size: PvogSearchClient.CATALOG_ENTRY_SERVICE_PAGE_SIZE,
        page,
      });
      const matchType = wire.meta.exact
        ? ServiceCatalogKeyMatchType.Exact
        : ServiceCatalogKeyMatchType.Hierarchy;

      services.push(
        ...(wire.content ?? []).map((item) => ({
          matchType,
          service: toServiceDescription(item),
        })),
      );
      totalPages = wire.totalPages ?? 1;

      if (totalPages > PvogSearchClient.MAX_CATALOG_ENTRY_SERVICE_PAGES) {
        throw new UpstreamContractViolationException(this.baseUrl + path, [
          `more than ${PvogSearchClient.MAX_CATALOG_ENTRY_SERVICE_PAGES} pages`,
        ]);
      }
      page += 1;
    } while (page < totalPages);

    return services;
  }

  private toLocation(wire: WireLocationDetails): Location {
    return {
      regionalKey: wire.regionalKey,
      federalStateKey: wire.federalStateKey,
      name: wire.municipality ?? wire.name,
    };
  }
}
