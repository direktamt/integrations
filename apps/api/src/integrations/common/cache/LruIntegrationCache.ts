import { LRUCache } from 'lru-cache';
import { IntegrationCache } from './IntegrationCache';

/**
 * Bounded in-process cache on top of lru-cache: at most `maxEntries`
 * entries, least recently used evicted first, per-entry TTL. Never stores
 * failures: callers only set successfully validated results.
 */
export class LruIntegrationCache implements IntegrationCache {
  private readonly entries: LRUCache<string, NonNullable<unknown>>;

  constructor(maxEntries: number) {
    this.entries = new LRUCache({ max: maxEntries });
  }

  get size(): number {
    return this.entries.size;
  }

  get<T>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.entries.get(key) as T | undefined);
  }

  set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (value !== undefined && value !== null && ttlMs > 0) {
      this.entries.set(key, value, { ttl: ttlMs });
    }

    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.entries.delete(key);

    return Promise.resolve();
  }
}
