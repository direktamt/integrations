import type { PublicServiceDescription } from '@direktamt/integrations-contracts';

/**
 * Summary of a service as plain text for compact display: upstream HTML
 * markup removed and entities decoded (DOMParser does not run scripts).
 * The full sanitized HTML stays available in the sections.
 */
export function deriveServiceSummary(
  service: PublicServiceDescription,
): string | undefined {
  if (!service.summary) {
    return undefined;
  }
  const text = new DOMParser()
    .parseFromString(service.summary, 'text/html')
    .body.textContent?.replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}
