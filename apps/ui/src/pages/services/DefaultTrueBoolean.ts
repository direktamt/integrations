/**
 * URL semantics of the boolean service-search options that default to
 * `true` in the integrations API (`fuzzySearch`, `useRegionalHierarchy`):
 * an absent parameter means `true`, only an explicit `false` disables the
 * option, and the canonical URL omits the default.
 */
export function parseDefaultTrueBoolean(value: string | null): boolean {
  return value === null ? true : value === 'true';
}

/**
 * Inverse of parseDefaultTrueBoolean: `false` must be written explicitly,
 * `true` (the default) is omitted from the URL.
 */
export function serializeDefaultTrueBoolean(
  value: boolean | undefined,
): 'false' | undefined {
  return value === false ? 'false' : undefined;
}
