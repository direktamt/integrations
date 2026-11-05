import { DirektAmtApiError } from '@direktamt/integrations-client';
import { toToolErrorResult } from './ToolErrorMapper';

function apiError(status: number, code?: string): DirektAmtApiError {
  return new DirektAmtApiError({ status, code, message: 'detail' });
}

function firstWord(error: unknown): string | undefined {
  const result = toToolErrorResult(error);
  const [block] = result?.content ?? [];

  expect(result?.isError ?? true).toBe(true);
  return block?.type === 'text' ? block.text.split(':')[0] : undefined;
}

describe('toToolErrorResult', () => {
  it.each([
    [400, 'invalidArguments'],
    [404, 'notFound'],
    [502, 'upstreamUnavailable'],
    [503, 'upstreamUnavailable'],
    [504, 'upstreamUnavailable'],
    [500, 'apiError'],
    [409, 'apiError'],
  ])('maps HTTP %i to %s', (status, kind) => {
    expect(firstWord(apiError(status))).toBe(kind);
  });

  it('maps a 2xx answer that is not JSON to apiError', () => {
    expect(firstWord(apiError(200, 'MALFORMED_RESPONSE'))).toBe('apiError');
  });

  it('maps a network failure to apiUnreachable without leaking its cause', () => {
    const result = toToolErrorResult(
      new TypeError('fetch failed', {
        cause: new Error('connect ECONNREFUSED 10.0.0.1:3000'),
      }),
    );

    expect(firstWord(new TypeError('fetch failed'))).toBe('apiUnreachable');
    expect(JSON.stringify(result)).not.toContain('10.0.0.1');
  });

  it('leaves cancellations and programming errors to the caller', () => {
    expect(
      toToolErrorResult(new DOMException('aborted', 'AbortError')),
    ).toBeUndefined();
    expect(toToolErrorResult(new Error('bug'))).toBeUndefined();
    expect(toToolErrorResult('text')).toBeUndefined();
  });
});
