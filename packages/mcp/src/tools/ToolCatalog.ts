import { CATALOG_TOOLS } from './CatalogTools.js';
import { LOCATION_TOOLS } from './LocationTools.js';
import { ONLINE_SERVICE_TOOLS } from './OnlineServiceTools.js';
import { SERVICE_TOOLS } from './ServiceTools.js';
import type { ToolDefinition } from './ToolDefinition.js';

/**
 * Every tool the server registers, in listing order: one per public
 * endpoint of the integrations API except EXCLUDED_ENDPOINTS.
 */
export const TOOL_CATALOG: readonly ToolDefinition[] = [
  ...LOCATION_TOOLS,
  ...SERVICE_TOOLS,
  ...ONLINE_SERVICE_TOOLS,
  ...CATALOG_TOOLS,
];
