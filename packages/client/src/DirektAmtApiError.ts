/**
 * Error body of the integrations API (NestJS shape); `message` is a list
 * for validation failures.
 */
interface IntegrationsApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

export interface DirektAmtApiErrorInit {
  status: number;
  code?: string;
  message: string;
  details?: string[];
  responseBody?: unknown;
}

/**
 * Thrown for every non-2xx answer of the integrations API and for a 2xx
 * answer whose body is not JSON. Carries the HTTP status, the API's error
 * code (`Bad Request`, `UpstreamHttpException`, ...), the individual
 * messages and the parsed body; never any headers.
 */
export class DirektAmtApiError extends Error {
  readonly status: number;

  /**
   * Error code of the API body (`error` field) or `MALFORMED_RESPONSE`.
   */
  readonly code?: string;

  /**
   * Individual messages; several for validation failures (400).
   */
  readonly details: string[];

  /**
   * Parsed JSON body of the response, or the raw text when it was not JSON.
   */
  readonly responseBody?: unknown;

  constructor(init: DirektAmtApiErrorInit) {
    super(init.message);
    this.name = 'DirektAmtApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? [init.message];
    this.responseBody = init.responseBody;
  }

  /**
   * Builds the error for a non-2xx response from its status and body text.
   */
  static fromResponse(
    status: number,
    bodyText: string,
    request: string,
  ): DirektAmtApiError {
    let body: unknown = bodyText;

    try {
      body = bodyText ? (JSON.parse(bodyText) as unknown) : undefined;
    } catch {
      // keep the raw text
    }

    const apiBody = isApiErrorBody(body) ? body : undefined;
    const details =
      apiBody?.message === undefined
        ? []
        : Array.isArray(apiBody.message)
          ? apiBody.message
          : [apiBody.message];

    return new DirektAmtApiError({
      status,
      code: apiBody?.error,
      message: details.join('; ') || `${request} failed with HTTP ${status}`,
      details: details.length
        ? details
        : [`${request} failed with HTTP ${status}`],
      responseBody: body,
    });
  }
}

function isApiErrorBody(value: unknown): value is IntegrationsApiErrorBody {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
