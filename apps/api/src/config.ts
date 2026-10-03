import * as dotenv from 'dotenv';
import { parsePvogServiceSearchVersion } from './integrations/pvog/serviceSearch/PvogServiceSearchVersion';

dotenv.config();

/**
 * Boolean flag from the environment: `true`/`1` or `false`/`0`; any other
 * value throws here and stops startup.
 */
function parseBooleanFlag(
  name: string,
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined || value === '') return fallback;

  switch (value.trim().toLowerCase()) {
    case 'true':
    case '1':
      return true;
    case 'false':
    case '0':
      return false;
    default:
      throw new Error(
        `${name} must be true or false, got ${JSON.stringify(value)}`,
      );
  }
}

export const CONFIG = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  integrations: {
    pvogSearchBaseUrl:
      process.env.PVOG_SEARCH_BASE_URL ??
      'https://pvog.fitko.net/suchdienst/api',
    /**
     * Upstream version of the PVOG service search behind GET /services;
     * v7 unless PVOG_SERVICE_SEARCH_VERSION says otherwise. An unknown
     * value throws here and stops startup.
     */
    pvogServiceSearchVersion: parsePvogServiceSearchVersion(
      process.env.PVOG_SERVICE_SEARCH_VERSION,
    ),
    fimPortalBaseUrl:
      process.env.FIM_PORTAL_BASE_URL ?? 'https://fimportal.de/api',
    /**
     * Resilience of outbound upstream requests (UpstreamRequestExecutor):
     * the budget of one request including retries, the retry policy for
     * transient failures and the per-provider circuit breaker. Invalid
     * values throw when the executor is built at startup.
     */
    resilience: {
      requestBudgetMs: Number(
        process.env.INTEGRATIONS_HTTP_TIMEOUT_MS ?? 15_000,
      ),
      retry: {
        maxRetries: Number(process.env.INTEGRATIONS_HTTP_MAX_RETRIES ?? 2),
        baseDelayMs: Number(
          process.env.INTEGRATIONS_HTTP_RETRY_BASE_DELAY_MS ?? 200,
        ),
        maxDelayMs: Number(
          process.env.INTEGRATIONS_HTTP_RETRY_MAX_DELAY_MS ?? 2_000,
        ),
      },
      circuitBreaker: {
        errorThresholdPercentage: Number(
          process.env.INTEGRATIONS_BREAKER_ERROR_THRESHOLD_PERCENTAGE ?? 50,
        ),
        volumeThreshold: Number(
          process.env.INTEGRATIONS_BREAKER_VOLUME_THRESHOLD ?? 5,
        ),
        rollingWindowMs: Number(
          process.env.INTEGRATIONS_BREAKER_ROLLING_WINDOW_MS ?? 10_000,
        ),
        resetTimeoutMs: Number(
          process.env.INTEGRATIONS_BREAKER_RESET_TIMEOUT_MS ?? 30_000,
        ),
      },
    },
    /**
     * Process-local cache for key-based, rarely changing upstream reads.
     */
    cache: {
      enabled: parseBooleanFlag(
        'INTEGRATIONS_CACHE_ENABLED',
        process.env.INTEGRATIONS_CACHE_ENABLED,
        true,
      ),
      maxEntries: Number(process.env.INTEGRATIONS_CACHE_MAX_ENTRIES ?? 1_000),
      ttlMs: Number(process.env.INTEGRATIONS_CACHE_TTL_MS ?? 300_000),
    },
  },
} as const;
