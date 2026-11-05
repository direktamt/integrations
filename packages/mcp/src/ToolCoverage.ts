/**
 * Result of comparing the public endpoints of the integrations API with the
 * endpoints the MCP tools cover. Every list is sorted; all empty means
 * complete coverage.
 */
export interface ToolCoverageReport {
  /**
   * Public endpoints without a tool and without an exclusion.
   */
  uncoveredEndpoints: string[];

  /**
   * Endpoints covered by more than one tool.
   */
  duplicateToolEndpoints: string[];

  /**
   * Tool endpoints that are not public endpoints of the API.
   */
  unknownToolEndpoints: string[];

  /**
   * Exclusions that are no public endpoint or that have a tool after all.
   */
  staleExclusions: string[];
}

/**
 * Compares endpoints written as `METHOD /path/{param}`.
 */
export function checkToolCoverage(
  publicEndpoints: readonly string[],
  toolEndpoints: readonly string[],
  excludedEndpoints: readonly string[],
): ToolCoverageReport {
  const published = new Set(publicEndpoints);
  const covered = new Set(toolEndpoints);
  const excluded = new Set(excludedEndpoints);

  return {
    uncoveredEndpoints: sorted(
      [...published].filter(
        (endpoint) => !covered.has(endpoint) && !excluded.has(endpoint),
      ),
    ),
    duplicateToolEndpoints: sorted(
      [...covered].filter(
        (endpoint) =>
          toolEndpoints.filter((candidate) => candidate === endpoint).length >
          1,
      ),
    ),
    unknownToolEndpoints: sorted(
      [...covered].filter((endpoint) => !published.has(endpoint)),
    ),
    staleExclusions: sorted(
      [...excluded].filter(
        (endpoint) => !published.has(endpoint) || covered.has(endpoint),
      ),
    ),
  };
}

/**
 * True when the report lists no problem.
 */
export function isCompleteCoverage(report: ToolCoverageReport): boolean {
  return Object.values(report).every(
    (problems: string[]) => problems.length === 0,
  );
}

/**
 * Turns a NestJS route into the endpoint notation of the tools:
 * `('GET', 'services/:id/context')` becomes `GET /services/{id}/context`.
 */
export function toEndpoint(method: string, routePath: string): string {
  const path = routePath
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => (part.startsWith(':') ? `{${part.slice(1)}}` : part))
    .join('/');

  return `${method.toUpperCase()} /${path}`;
}

function sorted(values: string[]): string[] {
  return [...values].sort();
}
