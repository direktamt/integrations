import type {
  PublicAuthority,
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { GetServiceQuery } from '../request/GetServiceQuery';
import { ListServiceAuthoritiesQuery } from '../request/ListServiceAuthoritiesQuery';
import { SearchServicesQuery } from '../request/SearchServicesQuery';

/**
 * Plain-language search for public services within a territory, the
 * canonical detail view of one service description, and the authorities
 * responsible for it.
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

  /**
   * Authorities responsible for the service in the territory, with addresses, contact channels and websites.
   */
  @Get(':id/authorities')
  listAuthorities(
    @Param('id') id: string,
    @Query() query: ListServiceAuthoritiesQuery,
  ): Promise<PublicAuthority[]> {
    return this.govDataFacade.listServiceAuthorities(
      id,
      query.regionalKey,
      query.useRegionalHierarchy,
    );
  }
}
