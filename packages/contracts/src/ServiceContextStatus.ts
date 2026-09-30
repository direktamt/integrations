import { ServiceContextPart } from './ServiceContextPart';

/**
 * Whether every part of a service context could be loaded.
 */
export interface ServiceContextStatus {
  /**
   * True when every auxiliary part was loaded; an empty part is still
   * complete.
   */
  complete: boolean;

  /**
   * Parts whose upstream source failed (no response, timeout, error status
   * or a response violating the wire contract). Such a part is returned as
   * an empty list; an empty part that is not listed here is a genuine empty
   * result. Master texts are derived from the catalog entries and are
   * therefore unavailable whenever the catalog entries are.
   */
  unavailableParts: ServiceContextPart[];
}
