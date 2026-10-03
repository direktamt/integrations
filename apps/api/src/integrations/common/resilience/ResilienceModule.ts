import { Module } from '@nestjs/common';
import { CONFIG } from '../../../config';
import { LruIntegrationCache } from '../cache/LruIntegrationCache';
import { INTEGRATION_CACHE, IntegrationCache } from '../cache/IntegrationCache';
import { NoopIntegrationCache } from '../cache/NoopIntegrationCache';
import { UpstreamRequestExecutor } from './UpstreamRequestExecutor';

/**
 * Process-wide resilience runtime of the upstream clients: one request
 * executor (per-provider circuit breakers, retry policy, request budget)
 * and one cache, both built from CONFIG at startup. Imported by every
 * integration module, instantiated once.
 */
@Module({
  providers: [
    {
      provide: UpstreamRequestExecutor,
      useFactory: (): UpstreamRequestExecutor =>
        new UpstreamRequestExecutor(CONFIG.integrations.resilience),
    },
    {
      provide: INTEGRATION_CACHE,
      useFactory: (): IntegrationCache =>
        CONFIG.integrations.cache.enabled
          ? new LruIntegrationCache(CONFIG.integrations.cache.maxEntries)
          : new NoopIntegrationCache(),
    },
  ],
  exports: [UpstreamRequestExecutor, INTEGRATION_CACHE],
})
export class ResilienceModule {}
