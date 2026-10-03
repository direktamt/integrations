/**
 * Injection token of the cache shared by the upstream clients.
 */
export const INTEGRATION_CACHE = Symbol('IntegrationCache');

/**
 * Key-value cache with per-entry TTL for key-based upstream reads whose
 * data changes rarely (territories, catalog entries, master texts,
 * organisation units). Implementations are process-local today; the
 * interface is asynchronous so that a shared store can replace them
 * without touching the clients.
 */
export interface IntegrationCache {
  get<T>(key: string): Promise<T | undefined>;

  set<T>(key: string, value: T, ttlMs: number): Promise<void>;

  delete?(key: string): Promise<void>;
}
