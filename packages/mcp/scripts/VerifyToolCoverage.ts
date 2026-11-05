/**
 * MCP tool coverage check:
 *
 *   npm run verify:mcp-coverage
 *
 * Reads the public routes of the integrations API from the NestJS route
 * metadata of its controllers (no server start, no network) and fails when
 * a public endpoint has neither a tool nor an entry in EXCLUDED_ENDPOINTS,
 * when two tools cover one endpoint, when a tool points at an endpoint the
 * API does not have, or when an exclusion is stale.
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { RequestMethod, type Type } from '@nestjs/common';
import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import {
  checkToolCoverage,
  isCompleteCoverage,
  toEndpoint,
} from '../src/ToolCoverage';
import { EXCLUDED_ENDPOINTS } from '../src/tools/ExcludedEndpoints';
import { TOOL_CATALOG } from '../src/tools/ToolCatalog';

const API_ROOT_MODULE = join(__dirname, '../../../apps/api/src/AppModule');

type ModuleImport = Type | { module: Type } | undefined;

async function main(): Promise<number> {
  // Loaded at run time, so that the type program of this package does not
  // include the API source.
  const { AppModule } = (await import(API_ROOT_MODULE)) as {
    AppModule: Type;
  };
  const publicEndpoints = listRoutes(AppModule);
  const toolEndpoints = TOOL_CATALOG.map((tool) => tool.endpoint);
  const excludedEndpoints = EXCLUDED_ENDPOINTS.map(
    (excluded) => excluded.endpoint,
  );
  const report = checkToolCoverage(
    publicEndpoints,
    toolEndpoints,
    excludedEndpoints,
  );

  console.log(
    `MCP tool coverage: ${publicEndpoints.length} public endpoints, ${toolEndpoints.length} tools, ${excludedEndpoints.length} excluded.`,
  );
  printProblems('Public endpoint without a tool', report.uncoveredEndpoints);
  printProblems(
    'Endpoint covered by several tools',
    report.duplicateToolEndpoints,
  );
  printProblems(
    'Tool for an endpoint the API does not have',
    report.unknownToolEndpoints,
  );
  printProblems('Stale exclusion', report.staleExclusions);

  if (!isCompleteCoverage(report)) {
    return 1;
  }
  console.log('Every public endpoint has a tool or a documented exclusion.');
  return 0;
}

/**
 * Collects `METHOD /path` of every controller route reachable from the
 * root module.
 */
function listRoutes(rootModule: Type): string[] {
  const endpoints = new Set<string>();
  const visited = new Set<Type>();
  const pending: ModuleImport[] = [rootModule];

  while (pending.length > 0) {
    const entry = pending.pop();
    const module = entry && 'module' in entry ? entry.module : entry;

    if (!module || visited.has(module)) {
      continue;
    }
    visited.add(module);
    pending.push(
      ...metadataList<ModuleImport>(MODULE_METADATA.IMPORTS, module),
    );

    for (const controller of metadataList<Type>(
      MODULE_METADATA.CONTROLLERS,
      module,
    )) {
      for (const endpoint of controllerRoutes(controller)) {
        endpoints.add(endpoint);
      }
    }
  }

  return [...endpoints].sort();
}

function controllerRoutes(controller: Type): string[] {
  const prototype = controller.prototype as Record<string, unknown>;
  const basePaths = pathList(Reflect.getMetadata(PATH_METADATA, controller));

  return Object.getOwnPropertyNames(prototype).flatMap((name) => {
    const handler = prototype[name];
    const method = Reflect.getMetadata(METHOD_METADATA, handler as object) as
      RequestMethod | undefined;

    if (typeof handler !== 'function' || method === undefined) {
      return [];
    }

    const routePaths = pathList(Reflect.getMetadata(PATH_METADATA, handler));

    return basePaths.flatMap((basePath) =>
      routePaths.map((routePath) =>
        toEndpoint(RequestMethod[method], `${basePath}/${routePath}`),
      ),
    );
  });
}

function metadataList<T>(key: string, target: object): T[] {
  return (Reflect.getMetadata(key, target) as T[] | undefined) ?? [];
}

function pathList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value as string[];
  }
  return [typeof value === 'string' ? value : ''];
}

function printProblems(label: string, endpoints: string[]): void {
  for (const endpoint of endpoints) {
    console.error(`  ${label}: ${endpoint}`);
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
