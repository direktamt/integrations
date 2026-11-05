import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DirektAmtClient } from '@direktamt/integrations-client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  CallToolResult,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js';
import { toToolErrorResult } from './ToolErrorMapper.js';
import { TOOL_CATALOG } from './tools/ToolCatalog.js';

/**
 * Name the server reports in the MCP initialization handshake.
 */
export const SERVER_NAME = 'direktamt-integrations';

/**
 * Every tool only reads official data from an external source.
 */
const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const INSTRUCTIONS = [
  'Read-only access to official German public-administration data (PVOG, FIM) through the DirektAmt integrations API.',
  'Territories are identified by a 12-digit regional key: get it from resolveLocation with a city name or postal code (suggestLocations helps with partial names).',
  'Find services of a territory with searchServices, then pass a service id with the regional key to getServiceContext for the complete picture, or to getService or listServiceAuthorities for single parts.',
  "When the service was picked in the federal catalog (searchCatalog), listCatalogEntryServices returns the territory's own service descriptions for its key.",
  'Results are returned as published by the authorities, neither summarised nor re-ranked; section texts are HTML.',
  'Errors start with a category: invalidArguments, notFound, upstreamUnavailable, apiError or apiUnreachable.',
].join(' ');

/**
 * Builds the MCP server with one tool per public endpoint of the
 * integrations API. Each tool validates its arguments, calls the client and
 * returns the response contract as JSON text, unchanged; API failures
 * become tool execution errors (ToolErrorMapper). No transport is attached.
 */
export function createIntegrationsMcpServer(
  client: DirektAmtClient,
): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: packageVersion() },
    { instructions: INSTRUCTIONS },
  );

  for (const tool of TOOL_CATALOG) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { title: tool.title, ...READ_ONLY },
      },
      async (input, extra): Promise<CallToolResult> => {
        try {
          const result = await tool.invoke(client, input, {
            signal: extra.signal,
          });

          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error) {
          const toolError = toToolErrorResult(error);

          if (toolError) {
            return toolError;
          }
          throw error;
        }
      },
    );
  }

  return server;
}

function packageVersion(): string {
  const manifest = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
  ) as { version: string };

  return manifest.version;
}
