import type {
  CatalogEntry,
  CatalogSearchResult,
  Location,
  LocationSuggestion,
  OnlineService,
  OnlineServiceAuthority,
  ParsedMasterText,
  PublicServiceDescription,
  RawSourceResponse,
  ServiceAuthority,
  ServiceContext,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Inject, Injectable } from '@nestjs/common';
import { FimPortalClient } from './fim/FimPortalClient';
import { PvogAuthorityClient } from './pvog/PvogAuthorityClient';
import { PvogRawClient } from './pvog/PvogRawClient';
import { PvogSearchClient } from './pvog/PvogSearchClient';
import { ServiceSearchOptions } from './pvog/model/ServiceSearchOptions';
import {
  SERVICE_SEARCH_PROVIDER,
  type ServiceSearchProvider,
} from './pvog/serviceSearch/ServiceSearchProvider';
import { ServiceContextAssembler } from './ServiceContextAssembler';

/**
 * Single entry point to external government data.
 *
 * Application code depends on this facade rather than individual upstream
 * clients, allowing storage, caching or provider implementations to evolve
 * without changing consumers. Compositions of several upstream resources
 * live here (or in a dedicated assembler), never inside the adapters.
 */
@Injectable()
export class GovDataFacade {
  constructor(
    private readonly pvogSearchClient: PvogSearchClient,
    @Inject(SERVICE_SEARCH_PROVIDER)
    private readonly serviceSearchProvider: ServiceSearchProvider,
    private readonly pvogAuthorityClient: PvogAuthorityClient,
    private readonly pvogRawClient: PvogRawClient,
    private readonly fimPortalClient: FimPortalClient,
    private readonly serviceContextAssembler: ServiceContextAssembler,
  ) {}

  /**
   * Autocomplete for the city input field.
   */
  suggestLocations(query: string): Promise<LocationSuggestion[]> {
    return this.pvogSearchClient.suggestLocations(query);
  }

  /**
   * Resolve a city name or postal code to territories (regional keys).
   */
  resolveLocation(criteria: {
    cityName?: string;
    postalCode?: string;
  }): Promise<Location[]> {
    return this.pvogSearchClient.resolveLocation(criteria);
  }

  /**
   * Reverse lookup: regional key (ARS) → territory data. Null when unknown.
   */
  getLocation(regionalKey: string): Promise<Location | null> {
    return this.pvogSearchClient.getLocation(regionalKey);
  }

  /**
   * Canonical detail view of one service description (e.g. for a deep link).
   */
  async getServiceDescription(
    id: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<PublicServiceDescription> {
    const detail = await this.pvogSearchClient.getServiceDescription(
      id,
      regionalKey,
      useRegionalHierarchy,
    );

    return detail.service;
  }

  /**
   * Authorities responsible for one service within a territory, with their
   * roles, addresses and contact channels; empty when the service names
   * none. The service detail supplies the references and roles, the
   * organisation-unit detail the contact data.
   */
  async listServiceAuthorities(
    serviceId: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<ServiceAuthority[]> {
    const detail = await this.pvogSearchClient.getServiceDescription(
      serviceId,
      regionalKey,
      useRegionalHierarchy,
    );
    const authorities = await this.pvogAuthorityClient.listAuthorities(
      detail.authorityReferences,
    );

    return authorities.map((authority, index) => ({
      authority,
      role: detail.authorityReferences[index].role,
    }));
  }

  /**
   * Authorities responsible for one online service with their roles,
   * addresses and contact channels; empty when the relation names none. The
   * relation supplies de-duplicated references and roles, the
   * organisation-unit detail the contact data (one call per distinct unit).
   */
  async listOnlineServiceAuthorities(
    onlineServiceId: string,
  ): Promise<OnlineServiceAuthority[]> {
    const references =
      await this.pvogAuthorityClient.listOnlineServiceAuthorityReferences(
        onlineServiceId,
      );
    const authorities =
      await this.pvogAuthorityClient.listAuthorities(references);

    return authorities.map((authority, index) => ({
      authority,
      roles: references[index].roles,
    }));
  }

  /**
   * Everything known about one service within a territory, composed from
   * PVOG and FIM; auxiliary parts degrade to empty lists with a status entry
   * when their upstream fails, the service itself is mandatory.
   */
  getServiceContext(
    serviceId: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<ServiceContext> {
    return this.serviceContextAssembler.assemble(
      serviceId,
      regionalKey,
      useRegionalHierarchy,
    );
  }

  /**
   * Plain-language search for public services within a territory: accepts a
   * query plus a resolved regional key and returns matching services with all
   * description sections. Served by the service-search adapter configured
   * at startup; the result contract is the same for every upstream version.
   */
  searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult> {
    return this.serviceSearchProvider.searchServices(
      regionalKey,
      query,
      options,
    );
  }

  /**
   * Direct online-application links for a territory, optionally per service.
   * All upstream pages are collected; the result is the complete set.
   */
  listOnlineServices(
    regionalKey: string,
    serviceCatalogKeys?: string[],
  ): Promise<OnlineService[]> {
    return this.pvogSearchClient.listOnlineServices(
      regionalKey,
      serviceCatalogKeys,
    );
  }

  /**
   * Raw JZuFi 2.3 representation of one service description as published
   * by PVOG; provider contract, not a normalized model.
   */
  getServiceDescriptionJzufi(id: string): Promise<RawSourceResponse> {
    return this.pvogRawClient.getServiceDescriptionJzufi(id);
  }

  /**
   * Raw JZuFi 2.3 representation of one online service as published by
   * PVOG; provider contract, not a normalized model.
   */
  getOnlineServiceJzufi(id: string): Promise<RawSourceResponse> {
    return this.pvogRawClient.getOnlineServiceJzufi(id);
  }

  /**
   * Search the federal service catalog (canonical service IDs + synonyms).
   */
  searchCatalog(
    term: string,
    limit?: number,
    offset?: number,
  ): Promise<CatalogSearchResult> {
    return this.fimPortalClient.searchCatalog(term, limit, offset);
  }

  /**
   * Single federal catalog entry by its service catalog key (LeiKa key).
   */
  getCatalogEntry(serviceCatalogKey: string): Promise<CatalogEntry> {
    return this.fimPortalClient.getCatalogEntry(serviceCatalogKey);
  }

  /**
   * Parsed federal master text as published by the FIM Portal
   * (unvalidated pass-through of a dynamic upstream shape).
   */
  getParsedMasterText(
    editorialOfficeId: string,
    serviceId: string,
    source?: string,
  ): Promise<ParsedMasterText> {
    return this.fimPortalClient.getParsedMasterText(
      editorialOfficeId,
      serviceId,
      source,
    );
  }
}
