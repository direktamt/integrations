import * as dotenv from 'dotenv';
import { parsePvogServiceSearchVersion } from './integrations/pvog/serviceSearch/PvogServiceSearchVersion';

dotenv.config();

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
    httpTimeoutMs: Number(process.env.INTEGRATIONS_HTTP_TIMEOUT_MS ?? 15_000),
  },
} as const;
