import type {
  CatalogEntry,
  CatalogSearchResult,
} from '@direktamt/integrations-contracts';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { SearchCatalogQuery } from '../request/SearchCatalogQuery';

/**
 * Federal service catalog search (canonical service IDs + synonyms).
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
}
