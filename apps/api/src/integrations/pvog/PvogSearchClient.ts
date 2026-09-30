import {
  AuthorityRole,
  ServiceSectionType,
  type Location,
  type LocationSuggestion,
  type OnlineService,
  type PublicServiceDescription,
  type ServiceSearchResult,
  type ServiceSection,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../config';
import { BaseHttpClient } from '../common/BaseHttpClient';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
import { nonEmpty } from '../common/OptionalText';
import { ServiceAuthorityReference } from './model/ServiceAuthorityReference';
import { ServiceDescriptionDetail } from './model/ServiceDescriptionDetail';
import { ServiceSearchOptions } from './model/ServiceSearchOptions';
import { WireAuthorityReference } from './wire/WireAuthorityReference';
import { WireLocationDetails } from './wire/WireLocationDetails';
import { WireLocationSuggestion } from './wire/WireLocationSuggestion';
import { WireOnlineService } from './wire/WireOnlineService';
import { WireOnlineServicesResponse } from './wire/WireOnlineServicesResponse';
import { WireServiceDescription } from './wire/WireServiceDescription';
import { WireServiceSearchResponse } from './wire/WireServiceSearchResponse';
import { WireServiceSection } from './wire/WireServiceSection';

/**
 * Adapter for the public PVOG Suchdienst API (no authentication).
 * Docs: GET {baseUrl}/v3/api-docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, section 1.
 */
@Injectable()
export class PvogSearchClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;

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
      service: this.toServiceDescription(wire),
      authorityReferences: (wire.authorities ?? []).map((reference) =>
        this.toAuthorityReference(reference),
      ),
    };
  }

  /**
   * Search public services available for a territory.
   */
  async searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult> {
    const wire = await this.getModel(
      WireServiceSearchResponse,
      `/v7/servicedescriptions/${encodeURIComponent(regionalKey)}`,
      {
        q: [query],
        size: options.size,
        page: options.page,
        fuzzysearch: options.fuzzySearch,
        useArsHierarchy: options.useRegionalHierarchy,
        personalMatters: options.lifeSituationCodes,
        validDate: options.validDate,
      },
    );

    const content = wire.serviceDescriptions?.content ?? [];

    return {
      services: content.map((item) => this.toServiceDescription(item)),
      totalElements: wire.serviceDescriptions?.totalElements,
      totalPages: wire.serviceDescriptions?.totalPages,
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

  private toLocation(wire: WireLocationDetails): Location {
    return {
      regionalKey: wire.regionalKey,
      federalStateKey: wire.federalStateKey,
      name: wire.municipality ?? wire.name,
    };
  }

  private toServiceDescription(
    wire: WireServiceDescription,
  ): PublicServiceDescription {
    return {
      id: wire.id,
      serviceCatalogKeys: wire.serviceCatalogKeys ?? [],
      title: wire.title,
      summary: wire.summary,
      regionalKeys: wire.regionalKeys ?? [],
      federalStateKeys: wire.federalStateKeys ?? [],
      targetAudiences: wire.addressees ?? [],
      availableLanguages: wire.availableLanguages ?? [],
      sections: (wire.sections ?? []).map((section) => this.toSection(section)),
    };
  }

  private toSection(wire: WireServiceSection): ServiceSection {
    return {
      type:
        PvogSearchClient.SECTION_TYPE_BY_TITLE.get(wire.title ?? '') ??
        ServiceSectionType.Other,
      originalTitle: wire.title,
      htmlText: wire.htmlText,
      links: (wire.links ?? []).map((link) => ({
        url: link.url,
        title: link.title,
        description: link.description,
      })),
    };
  }

  private toAuthorityReference(
    wire: WireAuthorityReference,
  ): ServiceAuthorityReference {
    return {
      id: wire.id,
      name: nonEmpty(wire.title),
      role:
        PvogSearchClient.ROLE_BY_CODE.get(wire.role?.code ?? '') ??
        AuthorityRole.Other,
    };
  }

  /**
   * XZuFi code list `xzufi.zustaendigkeitsrolle` → domain role. Code "01"
   * is not part of the current code-list version but is still published by
   * PVOG (observed live on 2026-09-30).
   */
  private static readonly ROLE_BY_CODE = new Map<string, AuthorityRole>([
    ['01', AuthorityRole.ResponsibleAuthorityAndContactPoint],
    ['02', AuthorityRole.ResponsibleAuthority],
    ['03', AuthorityRole.ContactPoint],
    ['11', AuthorityRole.SinglePointOfContact],
    ['19', AuthorityRole.OtherSinglePointOfContact],
  ]);

  /**
   * Published section titles → domain section type; unknown titles fall back to Other.
   */
  private static readonly SECTION_TYPE_BY_TITLE = new Map<
    string,
    ServiceSectionType
  >([
    ['Kurzinfo', ServiceSectionType.ShortInfo],
    ['Leistungsbezeichnung', ServiceSectionType.ServiceName],
    ['Leistungsbezeichnung II (Leistungsname)', ServiceSectionType.ServiceName],
    ['Beschreibung', ServiceSectionType.Description],
    ['Voraussetzungen', ServiceSectionType.Requirements],
    ['Erforderliche Unterlagen', ServiceSectionType.RequiredDocuments],
    ['Formulare', ServiceSectionType.Forms],
    ['Kosten & Gebühren', ServiceSectionType.Fees],
    ['Fristen', ServiceSectionType.Deadlines],
    ['Verfahrensablauf', ServiceSectionType.Procedure],
    ['Bearbeitungsdauer', ServiceSectionType.ProcessingTime],
    ['Rechtsgrundlage(n)', ServiceSectionType.LegalBasis],
    ['Rechtsbehelf', ServiceSectionType.LegalRemedy],
    ['Zuständige Stelle', ServiceSectionType.ResponsibleAuthority],
    ['Ansprechpunkt', ServiceSectionType.ContactPoint],
    ['weiterführende Informationen', ServiceSectionType.FurtherInformation],
  ]);
}
