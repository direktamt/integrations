import {
  checkToolCoverage,
  isCompleteCoverage,
  toEndpoint,
} from './ToolCoverage';
import { EXCLUDED_ENDPOINTS } from './tools/ExcludedEndpoints';
import { TOOL_CATALOG } from './tools/ToolCatalog';

const PUBLIC = ['GET /a', 'GET /b/{id}', 'GET /raw/c'];

describe('checkToolCoverage', () => {
  it('accepts every endpoint covered by one tool or one exclusion', () => {
    const report = checkToolCoverage(
      PUBLIC,
      ['GET /a', 'GET /b/{id}'],
      ['GET /raw/c'],
    );

    expect(isCompleteCoverage(report)).toBe(true);
  });

  it('reports a public endpoint without a tool', () => {
    const report = checkToolCoverage(PUBLIC, ['GET /a'], ['GET /raw/c']);

    expect(report.uncoveredEndpoints).toEqual(['GET /b/{id}']);
    expect(isCompleteCoverage(report)).toBe(false);
  });

  it('reports an endpoint covered twice and a tool without an endpoint', () => {
    const report = checkToolCoverage(
      PUBLIC,
      ['GET /a', 'GET /a', 'GET /b/{id}', 'GET /gone'],
      ['GET /raw/c'],
    );

    expect(report.duplicateToolEndpoints).toEqual(['GET /a']);
    expect(report.unknownToolEndpoints).toEqual(['GET /gone']);
  });

  it('reports an exclusion that is no endpoint or that has a tool', () => {
    const report = checkToolCoverage(
      PUBLIC,
      ['GET /a', 'GET /b/{id}', 'GET /raw/c'],
      ['GET /raw/c', 'GET /raw/gone'],
    );

    expect(report.staleExclusions).toEqual(['GET /raw/c', 'GET /raw/gone']);
  });
});

describe('toEndpoint', () => {
  it.each([
    ['GET', 'locations/', 'GET /locations'],
    ['GET', 'locations/suggestions', 'GET /locations/suggestions'],
    ['GET', 'services/:id/context', 'GET /services/{id}/context'],
    [
      'GET',
      '/master-texts//:editorialOfficeId/:serviceId',
      'GET /master-texts/{editorialOfficeId}/{serviceId}',
    ],
  ])('turns %s %s into %s', (method, path, endpoint) => {
    expect(toEndpoint(method, path)).toBe(endpoint);
  });
});

describe('tool catalog', () => {
  it('has unique camelCase tool names and well-formed endpoints', () => {
    const names = TOOL_CATALOG.map((tool) => tool.name);

    expect(new Set(names).size).toBe(names.length);
    for (const tool of TOOL_CATALOG) {
      expect(tool.name).toMatch(/^(get|list|search|suggest|resolve)[A-Z]\w+$/);
      expect(tool.endpoint).toMatch(/^GET \/[a-z-]+(\/[\w{}-]+)*$/);
    }
  });

  it('excludes exactly the two raw PVOG pass-through endpoints', () => {
    expect(EXCLUDED_ENDPOINTS.map((excluded) => excluded.endpoint)).toEqual([
      'GET /raw/pvog/services/{id}/jzufi-2-3',
      'GET /raw/pvog/online-services/{id}/jzufi-2-3',
    ]);
  });
});
