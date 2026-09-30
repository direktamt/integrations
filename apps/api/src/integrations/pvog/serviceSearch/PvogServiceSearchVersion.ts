/**
 * Upstream API versions of the PVOG service search this project can run
 * on. v7 is the production default; v8beta1 is a supported experimental
 * adapter that is never selected implicitly.
 */
export enum PvogServiceSearchVersion {
  V7 = 'v7',
  V8Beta1 = 'v8beta1',
}

export const DEFAULT_PVOG_SERVICE_SEARCH_VERSION = PvogServiceSearchVersion.V7;

/**
 * Parses PVOG_SERVICE_SEARCH_VERSION; an unset or empty value means the
 * default, anything else than the known versions is a configuration error
 * that must stop startup.
 */
export function parsePvogServiceSearchVersion(
  value: string | undefined,
): PvogServiceSearchVersion {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_PVOG_SERVICE_SEARCH_VERSION;
  }

  const known = Object.values(PvogServiceSearchVersion) as string[];

  if (!known.includes(value)) {
    throw new Error(
      `PVOG_SERVICE_SEARCH_VERSION must be one of ${known.join(', ')}; got "${value}"`,
    );
  }

  return value as PvogServiceSearchVersion;
}
