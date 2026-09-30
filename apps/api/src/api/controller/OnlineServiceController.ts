import type {
  OnlineService,
  OnlineServiceAuthority,
} from '@direktamt/integrations-contracts';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { ListOnlineServicesQuery } from '../request/ListOnlineServicesQuery';

/**
 * Direct online-application links for a territory, optionally filtered per
 * service, and the authorities responsible for one online service. The
 * list stays cheap: authorities are only resolved through the explicit
 * sub-resource (or the composed service context), never per list row.
 */
@Controller('online-services')
export class OnlineServiceController {
  constructor(private readonly govDataFacade: GovDataFacade) {}

  @Get()
  list(@Query() query: ListOnlineServicesQuery): Promise<OnlineService[]> {
    return this.govDataFacade.listOnlineServices(
      query.regionalKey,
      query.serviceCatalogKeys,
    );
  }

  /**
   * Authorities responsible for the online service with their roles, addresses, contact channels and websites.
   */
  @Get(':id/authorities')
  listAuthorities(@Param('id') id: string): Promise<OnlineServiceAuthority[]> {
    return this.govDataFacade.listOnlineServiceAuthorities(id);
  }
}
