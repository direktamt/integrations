import type {
  CatalogEntry,
  CatalogSearchResult,
  Location,
  LocationSuggestion,
  OnlineService,
  ParsedMasterText,
  PublicAuthority,
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { FimPortalClient } from './fim/FimPortalClient';
import { PvogAuthorityClient } from './pvog/PvogAuthorityClient';
import { PvogSearchClient } from './pvog/PvogSearchClient';
import { ServiceSearchOptions } from './pvog/model/ServiceSearchOptions';

/**
 * Single entry point to external government data.
 *
 * Application code depends on this facade rather than individual upstream
 * clients, allowing storage, caching or provider implementations to evolve
 * without changing consumers.
 */
@Injectable()
export class GovDataFacade {
  constructor(
    private readonly pvogSearchClient: PvogSearchClient,
    private readonly pvogAuthorityClient: PvogAuthorityClient,
    private readonly fimPortalClient: FimPortalClient,
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
  getServiceDescription(
    id: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<PublicServiceDescription> {
    return this.pvogSearchClient.getServiceDescription(
      id,
      regionalKey,
      useRegionalHierarchy,
    );
  }

  /**
   * Authorities responsible for one service within a territory, with their
   * addresses and contact channels; empty when the service names none.
   */
  listServiceAuthorities(
    serviceId: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<PublicAuthority[]> {
    return this.pvogAuthorityClient.listServiceAuthorities(
      serviceId,
      regionalKey,
      useRegionalHierarchy,
    );
  }

  /**
   * Plain-language search for public services within a territory: accepts a
   * query plus a resolved regional key and returns matching services with all
   * description sections.
   */
  searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult> {
    return this.pvogSearchClient.searchServices(regionalKey, query, options);
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
