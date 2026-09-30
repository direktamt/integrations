/**
 * Maps every item through an asynchronous function with at most `limit`
 * invocations in flight, preserving the input order in the result. The
 * first rejection is propagated once the calls already in flight settle.
 */
export async function mapConcurrently<T, R>(
  items: readonly T[],
  limit: number,
  map: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(
      `concurrency limit must be a positive integer, got ${limit}`,
    );
  }

  const results: R[] = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;

      results[index] = await map(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}
