import { DriftClass } from './DriftClass';
import { UpstreamProvider } from './UpstreamProbe';

export type ContractState =
  'valid' | 'violated' | 'not-validated' | 'unavailable';

/**
 * Outcome of one probe.
 */
export interface ContractDriftFinding {
  provider: UpstreamProvider;
  endpoint: string;
  handbookSection: string;

  /**
   * Request URL reduced to origin and path.
   */
  url: string;

  /**
   * Final HTTP status, if any response arrived.
   */
  status?: number;

  contentType?: string;

  contract: ContractState;

  /**
   * True when the upstream sent `X-Pvog-Deprecated: true`.
   */
  deprecated: boolean;

  /**
   * Most severe class of the finding; null when nothing was found.
   */
  driftClass: DriftClass | null;

  /**
   * Human-readable details, most severe first.
   */
  messages: string[];

  attempts: number;
}
