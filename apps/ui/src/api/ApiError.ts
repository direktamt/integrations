/**
 * Error thrown by the API client: HTTP status plus the message(s)
 * from the integrations API error body.
 */
export class ApiError extends Error {
  /**
   * HTTP status code; 0 for network failures without a response.
   */
  readonly status: number;

  /**
   * Individual messages from the integrations API body — class-validator
   * returns an array for 400 responses.
   */
  readonly details: string[];

  constructor(status: number, details: string[]) {
    super(details.join('; ') || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
