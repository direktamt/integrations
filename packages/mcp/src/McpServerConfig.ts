/**
 * Environment variable with the origin of the integrations API.
 */
export const API_BASE_URL_VARIABLE = 'DIREKTAMT_API_BASE_URL';

/**
 * Default origin: the integrations API started locally on its default port.
 */
export const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export interface McpServerConfig {
  /**
   * Origin (and optional path prefix) of the integrations API.
   */
  apiBaseUrl: string;
}

/**
 * Reads the server configuration from the environment; throws for a value
 * that is not an http(s) URL, so that the process stops before it serves.
 */
export function readMcpServerConfig(
  env: Record<string, string | undefined>,
): McpServerConfig {
  const value = env[API_BASE_URL_VARIABLE]?.trim() || DEFAULT_API_BASE_URL;
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${API_BASE_URL_VARIABLE} must be an http(s) URL, got ${JSON.stringify(value)}`,
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `${API_BASE_URL_VARIABLE} must be an http(s) URL, got ${JSON.stringify(value)}`,
    );
  }

  return { apiBaseUrl: value };
}
