/**
 * Reduce an upstream request URL to its origin and path for logs and
 * exception messages. Query parameters carry request inputs such as search
 * terms, postal codes and regional keys and are therefore dropped entirely.
 */
export function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}
