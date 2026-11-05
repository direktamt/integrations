#!/usr/bin/env node
import { DirektAmtClient } from '@direktamt/integrations-client';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createIntegrationsMcpServer } from './IntegrationsMcpServer.js';
import { readMcpServerConfig } from './McpServerConfig.js';

/**
 * stdio entry point: stdout carries the MCP protocol only, diagnostics go
 * to stderr.
 */
async function main(): Promise<void> {
  const config = readMcpServerConfig(process.env);
  const client = new DirektAmtClient({ baseUrl: config.apiBaseUrl });
  const server = createIntegrationsMcpServer(client);

  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
