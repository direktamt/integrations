import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/IntegrationsModule';
import { CatalogController } from './controller/CatalogController';
import { LocationController } from './controller/LocationController';
import { MasterTextController } from './controller/MasterTextController';
import { OnlineServiceController } from './controller/OnlineServiceController';
import { ServiceController } from './controller/ServiceController';

/**
 * HTTP layer of the integrations API. Controllers depend only on GovDataFacade;
 * request validation lives in the query classes under request/.
 */
@Module({
  imports: [IntegrationsModule],
  controllers: [
    LocationController,
    ServiceController,
    OnlineServiceController,
    CatalogController,
    MasterTextController,
  ],
})
export class ApiModule {}
