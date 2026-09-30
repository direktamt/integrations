import type { OnlineService } from '@direktamt/integrations-contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { ListOnlineServicesQuery } from '../request/ListOnlineServicesQuery';

/**
 * Direct online-application links for a territory,
 * optionally filtered per service.
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
}
