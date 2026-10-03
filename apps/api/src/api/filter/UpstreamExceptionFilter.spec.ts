import { ArgumentsHost, Logger } from '@nestjs/common';
import { UpstreamCircuitOpenException } from '../../integrations/common/exceptions/UpstreamCircuitOpenException';
import { UpstreamContractViolationException } from '../../integrations/common/exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../../integrations/common/exceptions/UpstreamHttpException';
import { UpstreamNetworkException } from '../../integrations/common/exceptions/UpstreamNetworkException';
import { UpstreamTimeoutException } from '../../integrations/common/exceptions/UpstreamTimeoutException';
import { UpstreamExceptionFilter } from './UpstreamExceptionFilter';

const URL = 'https://upstream.test/api/thing';

interface SentResponse {
  status: number;
  body: { statusCode: number; error: string; message: string };
}

interface StubResponse {
  status(code: number): StubResponse;
  json(body: SentResponse['body']): void;
}

function run(
  exception: Parameters<UpstreamExceptionFilter['catch']>[0],
): SentResponse {
  const sent: Partial<SentResponse> = {};
  const response: StubResponse = {
    status(code) {
      sent.status = code;
      return response;
    },
    json(body) {
      sent.body = body;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new UpstreamExceptionFilter().catch(exception, host);

  return sent as SentResponse;
}

describe('UpstreamExceptionFilter', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('maps an upstream 404 to a local 404', () => {
    const sent = run(new UpstreamHttpException(URL, 404));

    expect(sent.status).toBe(404);
    expect(sent.body.statusCode).toBe(404);
    expect(sent.body.error).toBe('UpstreamHttpException');
  });

  it('maps a timeout to 504', () => {
    const sent = run(new UpstreamTimeoutException(URL, 15000));

    expect(sent.status).toBe(504);
    expect(sent.body.error).toBe('UpstreamTimeoutException');
  });

  it.each([
    ['other upstream status', new UpstreamHttpException(URL, 500)],
    [
      'network failure',
      new UpstreamNetworkException(URL, new Error('ECONNRESET')),
    ],
    [
      'contract violation',
      new UpstreamContractViolationException(URL, ['name: must be a string']),
    ],
    ['open circuit', new UpstreamCircuitOpenException(URL, 'PVOG')],
  ])('maps a %s to 502', (_label, exception) => {
    expect(run(exception).status).toBe(502);
  });

  it('never exposes the upstream URL or body to the client', () => {
    const sent = run(
      new UpstreamHttpException(URL, 500, '<html>internal</html>'),
    );

    expect(JSON.stringify(sent.body)).not.toContain('upstream.test');
    expect(JSON.stringify(sent.body)).not.toContain('internal');
  });
});
