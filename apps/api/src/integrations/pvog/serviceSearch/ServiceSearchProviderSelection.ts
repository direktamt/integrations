import { PvogServiceSearchVersion } from './PvogServiceSearchVersion';
import { ServiceSearchProvider } from './ServiceSearchProvider';

/**
 * Picks the adapter for the configured upstream version. Selection happens
 * once at startup; there is deliberately no per-request switch.
 */
export function selectServiceSearchProvider(
  version: PvogServiceSearchVersion,
  providers: Record<PvogServiceSearchVersion, ServiceSearchProvider>,
): ServiceSearchProvider {
  return providers[version];
}
