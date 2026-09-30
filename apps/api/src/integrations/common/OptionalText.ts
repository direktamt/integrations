/**
 * Upstream systems publish empty strings for absent values; the domain
 * contracts omit them instead.
 */
export function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.trim() !== '' ? value : undefined;
}
