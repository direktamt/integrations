import * as dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
  integrations: {
    pvogSearchBaseUrl:
      process.env.PVOG_SEARCH_BASE_URL ??
      'https://pvog.fitko.net/suchdienst/api',
    fimPortalBaseUrl:
      process.env.FIM_PORTAL_BASE_URL ?? 'https://fimportal.de/api',
    httpTimeoutMs: Number(process.env.INTEGRATIONS_HTTP_TIMEOUT_MS ?? 15_000),
  },
} as const;
