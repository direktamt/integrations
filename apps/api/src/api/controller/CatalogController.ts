import type {
  CatalogEntry,
  CatalogEntryService,
  CatalogSearchResult,
} from '@direktamt/integrations-contracts';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { ListCatalogEntryServicesParams } from '../request/ListCatalogEntryServicesParams';
import { ListCatalogEntryServicesQuery } from '../request/ListCatalogEntryServicesQuery';
import { SearchCatalogQuery } from '../request/SearchCatalogQuery';

/**
 * Federal service catalog search (canonical service IDs + synonyms) and the
 * service descriptions a territory publishes for a catalog key.
 */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly govDataFacade: GovDataFacade) {}

  @Get()
  search(@Query() query: SearchCatalogQuery): Promise<CatalogSearchResult> {
    return this.govDataFacade.searchCatalog(
      query.term,
      query.limit,
      query.offset,
    );
  }

  @Get(':serviceCatalogKey')
  get(
    @Param('serviceCatalogKey') serviceCatalogKey: string,
  ): Promise<CatalogEntry> {
    return this.govDataFacade.getCatalogEntry(serviceCatalogKey);
  }

  /**
   * Service descriptions the territory publishes for the catalog key, each marked EXACT or HIERARCHY: exact-key descriptions when there are any, otherwise descriptions with more specific keys (refined variants), otherwise with more general keys; parent territories are included. Empty when nothing is published.
   */
  @Get(':serviceCatalogKey/services')
  listServices(
    @Param() params: ListCatalogEntryServicesParams,
    @Query() query: ListCatalogEntryServicesQuery,
  ): Promise<CatalogEntryService[]> {
    return this.govDataFacade.listCatalogEntryServices(
      params.serviceCatalogKey,
      query.regionalKey,
    );
  }
}
