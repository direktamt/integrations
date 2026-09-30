import { sanitizeUrlForLogging } from '../integrations/common/UrlSanitizer';
import { ContractDriftFinding, ContractState } from './ContractDriftFinding';
import { DriftClass } from './DriftClass';
import { ProbeKind, UpstreamProbe } from './UpstreamProbe';
import { inspectWireShape } from './WireShapeInspector';

export type FetchFunction = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export interface ContractDriftVerifierOptions {
  fetch?: FetchFunction;

  /**
   * Attempts per request before a transport or 5xx failure counts as an
   * infrastructure failure.
   */
  maxAttempts?: number;

  timeoutMs?: number;

  /**
   * Pause before a retry; multiplied by the attempt number.
   */
  retryDelayMs?: number;
}

interface Observation {
  status: number;
  contentType?: string;
  deprecated: boolean;
  location?: string;
  body: string;
  attempts: number;
}

/**
 * Runs reference requests against the implemented upstream endpoints and
 * classifies what it sees. Transport failures, timeouts and 5xx/429 answers
 * are retried a bounded number of times and then reported as
 * INFRASTRUCTURE_FAILURE, never as contract drift. Redirects are not
 * followed: a moved endpoint is a finding.
 */
export class ContractDriftVerifier {
  private readonly fetch: FetchFunction;
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;

  constructor(options: ContractDriftVerifierOptions = {}) {
    this.fetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
    this.maxAttempts = options.maxAttempts ?? 3;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.retryDelayMs = options.retryDelayMs ?? 2_000;
  }

  async verify(probe: UpstreamProbe): Promise<ContractDriftFinding> {
    const base = {
      provider: probe.provider,
      endpoint: probe.endpoint,
      handbookSection: probe.handbookSection,
      url: sanitizeUrlForLogging(probe.url),
    };
    const observation = await this.observe(probe.url);

    if (observation instanceof Error) {
      return {
        ...base,
        contract: 'unavailable',
        deprecated: false,
        driftClass: DriftClass.InfrastructureFailure,
        messages: [observation.message],
        attempts: this.maxAttempts,
      };
    }

    const messages: string[] = [];
    const classes: DriftClass[] = [];
    let contract: ContractState = 'unavailable';

    if (observation.status >= 300 && observation.status < 400) {
      classes.push(DriftClass.Breaking);
      messages.push(
        `unexpected redirect (HTTP ${observation.status}) to ${describeLocation(observation.location)}`,
      );
    } else if (observation.status < 200 || observation.status >= 300) {
      classes.push(DriftClass.Breaking);
      messages.push(`reference request answered HTTP ${observation.status}`);
    } else {
      if (observation.status !== 200) {
        classes.push(DriftClass.Cosmetic);
        messages.push(`HTTP ${observation.status} instead of 200`);
      }
      const parsed = parseJson(observation);

      if (!parsed.ok) {
        classes.push(DriftClass.Breaking);
        messages.push(parsed.message);
      } else if (probe.kind === ProbeKind.Raw) {
        contract = 'not-validated';
        if (probe.instability) {
          messages.push(`raw pass-through; upstream: ${probe.instability}`);
        }
      } else {
        const payload = parsed.value;
        const inspection = inspectWireShape(
          probe.wireModel!,
          payload,
          probe.expectsArray ?? false,
        );

        contract = inspection.violations.length ? 'violated' : 'valid';
        if (inspection.violations.length) {
          classes.push(DriftClass.Breaking);
          messages.push(
            ...inspection.violations.map((v) => `wire contract: ${v}`),
          );
        }
        const unknownFields = inspection.unknownFields.filter(
          (field) => !(probe.knownUndeclaredFields ?? []).includes(field),
        );

        if (unknownFields.length) {
          classes.push(DriftClass.Additive);
          messages.push(`undeclared fields: ${unknownFields.join(', ')}`);
        }
        if (probe.pagination && contract === 'valid') {
          const outcome = await this.followPagination(probe, payload);

          classes.push(...outcome.classes);
          messages.push(...outcome.messages);
          if (outcome.contract) contract = outcome.contract;
        }
      }
    }

    if (observation.deprecated) {
      classes.push(DriftClass.Deprecated);
      messages.push('upstream sent X-Pvog-Deprecated: true');
    }

    return {
      ...base,
      status: observation.status,
      contentType: observation.contentType,
      contract,
      deprecated: observation.deprecated,
      driftClass: mostSevere(classes),
      messages,
      attempts: observation.attempts,
    };
  }

  /**
   * Follows the cursor of a paginated endpoint: every page must satisfy the
   * wire model, a repeated cursor is breaking, and the cursor must be usable
   * within the page cap.
   */
  private async followPagination(
    probe: UpstreamProbe,
    firstPage: unknown,
  ): Promise<{
    classes: DriftClass[];
    messages: string[];
    contract?: ContractState;
  }> {
    const pagination = probe.pagination!;
    const seen = new Set<string>();
    let token = readToken(firstPage, pagination.tokenField);
    let pages = 1;

    if (token === undefined) {
      return {
        classes: [DriftClass.Breaking],
        messages: [
          `pagination: cursor field '${pagination.tokenField}' is missing or not a string`,
        ],
        contract: 'violated',
      };
    }

    while (token !== '') {
      if (seen.has(token)) {
        return {
          classes: [DriftClass.Breaking],
          messages: [
            `pagination: cursor repeated after ${pages} page(s); the list would never terminate`,
          ],
          contract: 'violated',
        };
      }
      if (pages >= pagination.maxPages) {
        return {
          classes: [],
          messages: [
            `pagination: cursor usable, ${pages} page(s) followed, stopped at the probe cap of ${pagination.maxPages}`,
          ],
        };
      }
      seen.add(token);
      const url = new URL(probe.url);

      url.searchParams.set(pagination.tokenParameter, token);
      const observation = await this.observe(url.toString());

      if (observation instanceof Error) {
        return {
          classes: [DriftClass.InfrastructureFailure],
          messages: [`pagination: page ${pages + 1}: ${observation.message}`],
        };
      }
      if (observation.status !== 200) {
        return {
          classes: [DriftClass.Breaking],
          messages: [
            `pagination: page ${pages + 1} answered HTTP ${observation.status}`,
          ],
          contract: 'violated',
        };
      }
      const parsed = parseJson(observation);

      if (!parsed.ok) {
        return {
          classes: [DriftClass.Breaking],
          messages: [`pagination: page ${pages + 1}: ${parsed.message}`],
          contract: 'violated',
        };
      }
      const payload = parsed.value;
      const inspection = inspectWireShape(probe.wireModel!, payload, false);

      if (inspection.violations.length) {
        return {
          classes: [DriftClass.Breaking],
          messages: inspection.violations.map(
            (v) => `pagination: page ${pages + 1}: wire contract: ${v}`,
          ),
          contract: 'violated',
        };
      }
      pages++;
      token = readToken(payload, pagination.tokenField);
      if (token === undefined) {
        return {
          classes: [DriftClass.Breaking],
          messages: [
            `pagination: page ${pages}: cursor field '${pagination.tokenField}' is missing or not a string`,
          ],
          contract: 'violated',
        };
      }
    }

    return {
      classes: [],
      messages: [
        pages === 1
          ? 'pagination: single page, terminated with an empty cursor (cursor not exercised)'
          : `pagination: cursor usable, ${pages} page(s) followed, terminated with an empty cursor`,
      ],
    };
  }

  /**
   * One request with bounded retries. Transport failures, timeouts and
   * 5xx/429 answers are retried; anything else is returned as observed.
   */
  private async observe(url: string): Promise<Observation | Error> {
    let lastFailure = 'no attempt made';

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (attempt > 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelayMs * (attempt - 1)),
        );
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetch(url, {
          headers: { Accept: 'application/json' },
          redirect: 'manual',
          signal: controller.signal,
        });
        const body = await response.text();

        if (response.status >= 500 || response.status === 429) {
          lastFailure = `upstream answered HTTP ${response.status}`;
          continue;
        }

        return {
          status: response.status,
          contentType: response.headers.get('content-type') ?? undefined,
          deprecated:
            response.headers.get('x-pvog-deprecated')?.toLowerCase() === 'true',
          location: response.headers.get('location') ?? undefined,
          body,
          attempts: attempt,
        };
      } catch (error) {
        lastFailure = controller.signal.aborted
          ? `no response within ${this.timeoutMs} ms`
          : `transport failure: ${error instanceof Error ? error.name : String(error)}`;
      } finally {
        clearTimeout(timer);
      }
    }

    return new Error(
      `${lastFailure} on ${this.maxAttempts} attempt(s); inconclusive, not contract drift`,
    );
  }
}

type ParsedBody = { ok: true; value: unknown } | { ok: false; message: string };

function parseJson(observation: Observation): ParsedBody {
  const contentType = observation.contentType ?? '';

  if (!/^application\/(.+\+)?json\b/i.test(contentType)) {
    return {
      ok: false,
      message: `content type is ${contentType || 'missing'}, expected application/json`,
    };
  }
  try {
    return { ok: true, value: JSON.parse(observation.body) as unknown };
  } catch {
    return { ok: false, message: 'body is not valid JSON' };
  }
}

function readToken(payload: unknown, field: string): string | undefined {
  if (payload === null || typeof payload !== 'object') return undefined;
  const value = (payload as Record<string, unknown>)[field];

  return typeof value === 'string' ? value : undefined;
}

function describeLocation(location: string | undefined): string {
  if (!location) return 'an unknown location';
  try {
    return new URL(location).origin;
  } catch {
    return 'a relative location';
  }
}

const SEVERITY: DriftClass[] = [
  DriftClass.Breaking,
  DriftClass.InfrastructureFailure,
  DriftClass.Deprecated,
  DriftClass.Additive,
  DriftClass.Cosmetic,
];

function mostSevere(classes: DriftClass[]): DriftClass | null {
  return SEVERITY.find((candidate) => classes.includes(candidate)) ?? null;
}
