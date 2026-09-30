import type {
  CatalogEntry,
  CatalogSearchResult,
  ParsedMasterText,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../config';
import { BaseHttpClient } from '../common/BaseHttpClient';
import { WireCatalogEntry } from './wire/WireCatalogEntry';
import { WireCatalogSearchResponse } from './wire/WireCatalogSearchResponse';

/**
 * Adapter for the public FIM Portal API (no authentication).
 * Swagger: https://fimportal.de/docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, section 2.
 */
@Injectable()
export class FimPortalClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.fimPortalBaseUrl;

  /**
   * Full-text search over the federal service catalog (LeiKa). The upstream
   * parameter is `fts_query`; a `search` parameter is silently ignored.
   */
  async searchCatalog(
    term: string,
    limit = 20,
    offset = 0,
  ): Promise<CatalogSearchResult> {
    const wire = await this.getModel(
      WireCatalogSearchResponse,
      '/v0/leistung-steckbriefe',
      {
        fts_query: term,
        limit,
        offset,
      },
    );
    return {
      entries: wire.entries.map((item) => this.toCatalogEntry(item)),
      offset: wire.offset,
      limit: wire.limit,
      count: wire.count,
      totalCount: wire.totalCount,
    };
  }

  /**
   * Fetch a single catalog entry by its service catalog key (LeiKa key).
   */
  async getCatalogEntry(serviceCatalogKey: string): Promise<CatalogEntry> {
    const wire = await this.getModel(
      WireCatalogEntry,
      `/v0/leistung-steckbriefe/${encodeURIComponent(serviceCatalogKey)}`,
    );
    return this.toCatalogEntry(wire);
  }

  /**
   * Parsed federal master text as published by the FIM Portal. The upstream
   * declares this representation unstable, so it is passed through without
   * a wire model.
   */
  async getParsedMasterText(
    editorialOfficeId: string,
    serviceId: string,
    source = 'primary',
  ): Promise<ParsedMasterText> {
    return this.getRawJson<ParsedMasterText>(
      `/v0/leistung-stammtexte/${encodeURIComponent(editorialOfficeId)}/${encodeURIComponent(
        serviceId,
      )}/${encodeURIComponent(source)}/parsed-xzufi`,
    );
  }

  private toCatalogEntry(wire: WireCatalogEntry): CatalogEntry {
    return {
      serviceCatalogKey: wire.serviceCatalogKey,
      editorialOfficeId: wire.editorialOfficeId,
      serviceId: wire.serviceId,
      title: wire.title,
      officialName: wire.officialName,
      citizenFacingName: wire.citizenFacingName ?? undefined,
      approvalStatus: wire.approvalStatus,
      createdAt: wire.createdAt,
      modifiedAt: wire.modifiedAt,
      typeCodes: wire.typeCodes ?? [],
      serviceType: wire.serviceType,
      legalBasis: wire.legalBasis,
    };
  }
}
