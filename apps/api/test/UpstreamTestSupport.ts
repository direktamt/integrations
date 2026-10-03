import { IntegrationCache } from '../src/integrations/common/cache/IntegrationCache';
import { NoopIntegrationCache } from '../src/integrations/common/cache/NoopIntegrationCache';
import {
  UpstreamRequestExecutor,
  UpstreamRequestExecutorOptions,
} from '../src/integrations/common/resilience/UpstreamRequestExecutor';

/**
 * Executor for unit tests: no retries and a breaker that practically never
 * opens, unless a test overrides them.
 */
export function testUpstreamRequestExecutor(
  options: Partial<UpstreamRequestExecutorOptions> = {},
): UpstreamRequestExecutor {
  return new UpstreamRequestExecutor({
    requestBudgetMs: 5_000,
    retry: { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 2 },
    circuitBreaker: {
      errorThresholdPercentage: 50,
      volumeThreshold: 1_000,
      rollingWindowMs: 10_000,
      resetTimeoutMs: 1_000,
    },
    ...options,
  });
}

/**
 * Constructor arguments of a BaseHttpClient subclass under test: the
 * executor above and a cache that stores nothing.
 */
export function testHttpClientDependencies(): [
  UpstreamRequestExecutor,
  IntegrationCache,
] {
  return [testUpstreamRequestExecutor(), new NoopIntegrationCache()];
}
