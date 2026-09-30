import type {
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { GetServiceQuery } from '../request/GetServiceQuery';
import { SearchServicesQuery } from '../request/SearchServicesQuery';

/**
 * Plain-language search for public services within a territory, plus the
 * canonical detail view of one service description.
 */
@Controller('services')
export class ServiceController {
  constructor(private readonly govDataFacade: GovDataFacade) {}

  @Get()
  search(@Query() query: SearchServicesQuery): Promise<ServiceSearchResult> {
    return this.govDataFacade.searchServices(query.regionalKey, query.query, {
      size: query.size,
      page: query.page,
      fuzzySearch: query.fuzzySearch,
      useRegionalHierarchy: query.useRegionalHierarchy,
      lifeSituationCodes: query.lifeSituationCodes,
      validDate: query.validDate,
    });
  }

  @Get(':id')
  get(
    @Param('id') id: string,
    @Query() query: GetServiceQuery,
  ): Promise<PublicServiceDescription> {
    return this.govDataFacade.getServiceDescription(
      id,
      query.regionalKey,
      query.useRegionalHierarchy,
    );
  }
}
