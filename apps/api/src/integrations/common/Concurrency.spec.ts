import { mapConcurrently } from './Concurrency';

describe('mapConcurrently', () => {
  it('preserves the input order in the result', async () => {
    const delays = [30, 5, 20, 1];

    const result = await mapConcurrently(
      delays,
      2,
      (delay, index) =>
        new Promise<string>((resolve) =>
          setTimeout(() => resolve(`${index}:${delay}`), delay),
        ),
    );

    expect(result).toEqual(['0:30', '1:5', '2:20', '3:1']);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;

    await mapConcurrently(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 2));
        inFlight--;
      },
    );

    expect(peak).toBe(3);
  });

  it('returns an empty list without invoking the mapper', async () => {
    const map = jest.fn();

    await expect(mapConcurrently([], 4, map)).resolves.toEqual([]);
    expect(map).not.toHaveBeenCalled();
  });

  it('propagates the first rejection', async () => {
    await expect(
      mapConcurrently([1, 2, 3], 2, (item) =>
        item === 2 ? Promise.reject(new Error('boom')) : Promise.resolve(item),
      ),
    ).rejects.toThrow('boom');
  });

  it('rejects a non-positive limit', async () => {
    await expect(
      mapConcurrently([1], 0, () => Promise.resolve(1)),
    ).rejects.toThrow(RangeError);
  });
});
