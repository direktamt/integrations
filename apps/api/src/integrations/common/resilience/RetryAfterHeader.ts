/**
 * Delay requested by a `Retry-After` response header, in milliseconds from
 * `now`: either a non-negative number of seconds or an HTTP-date. Anything
 * else is ignored and the caller falls back to its own backoff.
 */
export function parseRetryAfterHeader(
  value: string | null,
  now: number,
): number | undefined {
  if (value === null) return undefined;

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;

  // HTTP-dates always contain letters; bare numbers are not dates here.
  if (!/[A-Za-z]/.test(trimmed)) return undefined;

  const date = Date.parse(trimmed);

  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}
