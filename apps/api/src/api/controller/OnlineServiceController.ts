import type { OnlineService } from '@direktamt/integrations-contracts';
import { Controller, Get, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { ListOnlineServicesQuery } from '../request/ListOnlineServicesQuery';

/**
 * Direct online-application links for a territory, optionally filtered per
 * service. The integration client follows PVOG pagination internally, so the
 * response contains all matching entries, not one upstream page.
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
