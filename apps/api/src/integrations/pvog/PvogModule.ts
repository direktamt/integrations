import { Module } from '@nestjs/common';
import { CONFIG } from '../../config';
import { ResilienceModule } from '../common/resilience/ResilienceModule';
import { PvogAuthorityClient } from './PvogAuthorityClient';
import { PvogRawClient } from './PvogRawClient';
import { PvogSearchClient } from './PvogSearchClient';
import { PvogServiceSearchVersion } from './serviceSearch/PvogServiceSearchVersion';
import {
  SERVICE_SEARCH_PROVIDER,
  ServiceSearchProvider,
} from './serviceSearch/ServiceSearchProvider';
import { selectServiceSearchProvider } from './serviceSearch/ServiceSearchProviderSelection';
import { PvogV7ServiceSearchProvider } from './serviceSearch/v7/PvogV7ServiceSearchProvider';
import { PvogV8BetaServiceSearchProvider } from './serviceSearch/v8beta1/PvogV8BetaServiceSearchProvider';

/**
 * PVOG adapters. The service-search adapter is chosen once at startup from
 * PVOG_SERVICE_SEARCH_VERSION (v7 by default); both versions stay
 * available, nothing selects one per request.
 */
@Module({
  imports: [ResilienceModule],
  providers: [
    PvogSearchClient,
    PvogAuthorityClient,
    PvogRawClient,
    PvogV7ServiceSearchProvider,
    PvogV8BetaServiceSearchProvider,
    {
      provide: SERVICE_SEARCH_PROVIDER,
      useFactory: (
        v7: PvogV7ServiceSearchProvider,
        v8beta1: PvogV8BetaServiceSearchProvider,
      ): ServiceSearchProvider =>
        selectServiceSearchProvider(
          CONFIG.integrations.pvogServiceSearchVersion,
          {
            [PvogServiceSearchVersion.V7]: v7,
            [PvogServiceSearchVersion.V8Beta1]: v8beta1,
          },
        ),
      inject: [PvogV7ServiceSearchProvider, PvogV8BetaServiceSearchProvider],
    },
  ],
  exports: [
    PvogSearchClient,
    PvogAuthorityClient,
    PvogRawClient,
    SERVICE_SEARCH_PROVIDER,
  ],
})
export class PvogModule {}
