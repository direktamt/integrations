import { Logger } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { CONFIG } from '../../config';
import { UpstreamContractViolationException } from './exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from './exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from './exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from './exceptions/UpstreamTimeoutException';
import { sanitizeUrlForLogging } from './UrlSanitizer';

export interface QueryParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * HTTP gateway shared by all external API clients: native fetch, timeout,
 * wire-contract validation, typed exceptions (see ./exceptions).
 *
 * Logs and exceptions only ever carry the sanitized upstream URL (origin and
 * path); query values such as search terms or postal codes are never logged.
 */
export abstract class BaseHttpClient {
  protected abstract readonly baseUrl: string;
  protected readonly timeoutMs: number = CONFIG.integrations.httpTimeoutMs;
  private readonly logger = new Logger(this.constructor.name);

  /**
   * GET expecting a single JSON object matching the given wire model.
   */
  protected async getModel<T extends object>(
    model: ClassConstructor<T>,
    path: string,
    params?: QueryParams,
  ): Promise<T> {
    const { url, payload } = await this.fetchJson(path, params);

    if (
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw this.contractViolation(url, [
        `expected a JSON object at the top level, got ${describeJsonValue(payload)}`,
      ]);
    }

    return this.toValidatedInstance(model, payload, url);
  }

  /**
   * GET expecting a JSON array whose items match the given wire model.
   */
  protected async getModelArray<T extends object>(
    model: ClassConstructor<T>,
    path: string,
    params?: QueryParams,
  ): Promise<T[]> {
    const { url, payload } = await this.fetchJson(path, params);

    if (!Array.isArray(payload)) {
      throw this.contractViolation(url, [
        `expected a JSON array at the top level, got ${describeJsonValue(payload)}`,
      ]);
    }

    return payload.map((item, index) =>
      this.toValidatedInstance(model, item, url, `[${index}]`),
    );
  }

  /**
   * GET without wire validation; only for endpoints with a dynamic shape.
   */
  protected async getRawJson<T>(
    path: string,
    params?: QueryParams,
  ): Promise<T> {
    const { payload } = await this.fetchJson(path, params);
    return payload as T;
  }

  /**
   * Performs the request; the returned `url` is already sanitized for logging.
   */
  private async fetchJson(
    path: string,
    params?: QueryParams,
  ): Promise<{ url: string; payload: unknown }> {
    const requestUrl = this.buildUrl(path, params);
    const url = sanitizeUrlForLogging(requestUrl);

    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let response: Response;

      try {
        response = await fetch(requestUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
      } catch (error) {
        throw this.transportFailure(url, error, controller);
      }

      if (!response.ok) {
        const bodySnippet = await readBodySnippet(response);

        this.logger.warn(`HTTP ${response.status} from upstream: ${url}`);

        throw new UpstreamHttpException(url, response.status, bodySnippet);
      }
      try {
        return { url, payload: (await response.json()) as unknown };
      } catch (error) {
        if (controller.signal.aborted) {
          throw this.transportFailure(url, error, controller);
        }

        throw this.contractViolation(url, ['response body is not valid JSON']);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private transportFailure(
    url: string,
    error: unknown,
    controller: AbortController,
  ): UpstreamTimeoutException | UpstreamNetworkException {
    if (controller.signal.aborted) {
      this.logger.error(`Timed out after ${this.timeoutMs} ms: ${url}`);

      return new UpstreamTimeoutException(url, this.timeoutMs);
    }

    this.logger.error(`Network failure for ${url}`, error);

    return new UpstreamNetworkException(url, error);
  }

  private toValidatedInstance<T extends object>(
    model: ClassConstructor<T>,
    payload: unknown,
    url: string,
    pathPrefix = '',
  ): T {
    if (
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw this.contractViolation(url, [
        `${pathPrefix || 'value'}: expected a JSON object, got ${describeJsonValue(payload)}`,
      ]);
    }

    const instance = plainToInstance(model, payload, {
      excludeExtraneousValues: true,
    });

    const errors = validateSync(instance, { forbidUnknownValues: false });

    if (errors.length > 0) {
      throw this.contractViolation(
        url,
        flattenValidationErrors(errors, pathPrefix),
      );
    }

    return instance;
  }

  private contractViolation(
    url: string,
    violations: string[],
  ): UpstreamContractViolationException {
    this.logger.error(
      `Wire contract violated by ${url}: ${violations.join('; ')}`,
    );

    return new UpstreamContractViolationException(url, violations);
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const url = new URL(this.baseUrl + path);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, item);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath: string,
): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    for (const constraint of Object.values(error.constraints ?? {})) {
      messages.push(`${path}: ${constraint}`);
    }
    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children, path));
    }
  }

  return messages;
}

function describeJsonValue(value: unknown): string {
  if (value === null) return 'null';

  if (Array.isArray(value)) return 'an array';

  return typeof value;
}

async function readBodySnippet(
  response: Response,
): Promise<string | undefined> {
  try {
    const text = await response.text();

    return text.slice(0, 300) || undefined;
  } catch {
    return undefined;
  }
}
