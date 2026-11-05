import { DirektAmtApiError } from '@direktamt/integrations-client';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Category of a failed tool call; the first word of the error text, so that
 * a model and a program can both tell the cases apart.
 */
export type ToolErrorKind =
  | 'invalidArguments'
  | 'notFound'
  | 'upstreamUnavailable'
  | 'apiError'
  | 'apiUnreachable';

/**
 * Maps a failure of the integrations API to an MCP tool execution error.
 *
 * The MCP specification reports API failures inside the tool result
 * (`isError: true`) rather than as JSON-RPC protocol errors, so that the
 * model sees what went wrong and can correct its arguments or try another
 * tool. Returns undefined for anything that is not an API failure (a
 * cancelled request, a programming error); the caller rethrows those.
 */
export function toToolErrorResult(error: unknown): CallToolResult | undefined {
  if (error instanceof DirektAmtApiError) {
    return toolError(kindOf(error), describe(error));
  }

  // The fetch standard rejects with a TypeError when no response arrives
  // (connection refused, DNS failure, reset).
  if (error instanceof TypeError) {
    return toolError(
      'apiUnreachable',
      'the integrations API could not be reached; check that it is running and that DIREKTAMT_API_BASE_URL points to it.',
    );
  }

  return undefined;
}

function kindOf(error: DirektAmtApiError): ToolErrorKind {
  switch (error.status) {
    case 400:
      return 'invalidArguments';
    case 404:
      return 'notFound';
    case 502:
    case 503:
    case 504:
      return 'upstreamUnavailable';
    default:
      return 'apiError';
  }
}

function describe(error: DirektAmtApiError): string {
  const code = error.code ? ` (${error.code})` : '';
  const retry =
    kindOf(error) === 'upstreamUnavailable'
      ? ' Retrying later may succeed.'
      : '';

  const details = error.details.join('; ').replace(/\.$/, '');

  return `the integrations API answered HTTP ${error.status}${code}: ${details}.${retry}`;
}

function toolError(kind: ToolErrorKind, text: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: `${kind}: ${text}` }],
  };
}
