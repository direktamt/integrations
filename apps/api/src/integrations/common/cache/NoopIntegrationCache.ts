import { IntegrationCache } from './IntegrationCache';

/**
 * Cache that stores nothing; bound when INTEGRATIONS_CACHE_ENABLED is false.
 */
export class NoopIntegrationCache implements IntegrationCache {
  get<T>(): Promise<T | undefined> {
    return Promise.resolve(undefined);
  }

  set(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}
