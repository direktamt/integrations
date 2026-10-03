/**
 * The request asked for search options the configured adapter cannot
 * honour; raised by the facade before any upstream call and answered as a
 * request-validation failure (400).
 */
export class UnsupportedServiceSearchOptionsException extends Error {
  constructor(readonly problems: string[]) {
    super(`Unsupported service search options: ${problems.join('; ')}`);

    this.name = 'UnsupportedServiceSearchOptionsException';
  }
}
