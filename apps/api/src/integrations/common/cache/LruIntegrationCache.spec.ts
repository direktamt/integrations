import { LruIntegrationCache } from './LruIntegrationCache';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('LruIntegrationCache', () => {
  let cache: LruIntegrationCache;

  beforeEach(() => {
    cache = new LruIntegrationCache(3);
  });

  it('returns a stored value until its TTL elapses', async () => {
    await cache.set('a', { v: 1 }, 20);

    await expect(cache.get('a')).resolves.toEqual({ v: 1 });
    await sleep(30);
    await expect(cache.get('a')).resolves.toBeUndefined();
  });

  it('misses unknown keys', async () => {
    await expect(cache.get('missing')).resolves.toBeUndefined();
  });

  it('evicts the least recently used entry beyond the bound', async () => {
    await cache.set('a', 1, 1_000);
    await cache.set('b', 2, 1_000);
    await cache.set('c', 3, 1_000);
    await cache.get('a');
    await cache.set('d', 4, 1_000);

    expect(cache.size).toBe(3);
    await expect(cache.get('b')).resolves.toBeUndefined();
    await expect(cache.get('a')).resolves.toBe(1);
    await expect(cache.get('d')).resolves.toBe(4);
  });

  it('replaces an existing key without growing', async () => {
    await cache.set('a', 1, 1_000);
    await cache.set('a', 2, 1_000);

    expect(cache.size).toBe(1);
    await expect(cache.get('a')).resolves.toBe(2);
  });

  it('stores nothing for a non-positive TTL or a nullish value', async () => {
    await cache.set('a', 1, 0);
    await cache.set('b', 1, -5);
    await cache.set('c', null, 1_000);
    await cache.set('d', undefined, 1_000);

    expect(cache.size).toBe(0);
  });

  it('deletes on request', async () => {
    await cache.set('a', 1, 1_000);
    await cache.delete('a');

    await expect(cache.get('a')).resolves.toBeUndefined();
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects maxEntries %p', (maxEntries) => {
    expect(() => new LruIntegrationCache(maxEntries)).toThrow();
  });
});
