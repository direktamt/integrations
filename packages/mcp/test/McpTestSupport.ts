import {
  DirektAmtClient,
  type FetchLike,
} from '@direktamt/integrations-client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createIntegrationsMcpServer } from '../src/IntegrationsMcpServer';

export interface RecordedCall {
  url: URL;
  init: Parameters<FetchLike>[1];
}

export type StubFetch = FetchLike & { calls: RecordedCall[] };

/**
 * Stub fetch: records every call and answers with the configured response
 * or rejection; never reaches the network.
 */
export function stubFetch(
  respond: (call: RecordedCall) => Promise<Response> | Response = () =>
    json({}),
): StubFetch {
  const calls: RecordedCall[] = [];
  const fetch = (async (input, init) => {
    const call = { url: new URL(input), init };

    calls.push(call);
    return respond(call);
  }) as StubFetch;

  fetch.calls = calls;

  return fetch;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export interface ConnectedServer {
  client: Client;
  close(): Promise<void>;
}

/**
 * The real server over a DirektAmtClient with the given fetch, connected to
 * an MCP client through the SDK's in-memory transport.
 */
export async function connectServer(
  fetch: FetchLike,
): Promise<ConnectedServer> {
  const server = createIntegrationsMcpServer(
    new DirektAmtClient({ baseUrl: 'http://api.test', fetch }),
  );
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  return (await client.callTool({
    name,
    arguments: args,
  })) as CallToolResult;
}

/**
 * Text of the single text block of a tool result.
 */
export function resultText(result: CallToolResult): string {
  const [block] = result.content;

  if (result.content.length !== 1 || block.type !== 'text') {
    throw new Error('expected exactly one text block');
  }
  return block.text;
}
