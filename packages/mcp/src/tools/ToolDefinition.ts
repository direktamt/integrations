import type {
  DirektAmtClient,
  RequestOptions,
} from '@direktamt/integrations-client';
import type { z } from 'zod';

/**
 * One MCP tool over exactly one public endpoint of the integrations API.
 * The tool forwards its validated arguments to the matching
 * `DirektAmtClient` method and returns the response contract unchanged.
 */
export interface ToolDefinition<Input extends z.ZodObject = z.ZodObject> {
  /**
   * Tool name as listed to MCP clients; camelCase, verb first, the same
   * verb semantics as the API (`get`, `list`, `search`, `suggest`,
   * `resolve`).
   */
  name: string;

  /**
   * Short human-readable title.
   */
  title: string;

  /**
   * The public endpoint the tool covers, `METHOD /path/{param}`; read by
   * the tool coverage check.
   */
  endpoint: string;

  /**
   * Written for a model: what the tool returns, when to use it and where
   * its required ids come from.
   */
  description: string;

  /**
   * Arguments; mirror the client request of the endpoint.
   */
  inputSchema: Input;

  /**
   * Calls the client method of the endpoint.
   */
  invoke(
    client: DirektAmtClient,
    input: z.infer<Input>,
    options: RequestOptions,
  ): Promise<unknown>;
}

/**
 * Keeps the argument type of `invoke` bound to the tool's own input schema.
 */
export function defineTool<Input extends z.ZodObject>(
  definition: ToolDefinition<Input>,
): ToolDefinition {
  return definition;
}
