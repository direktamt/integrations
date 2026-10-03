import { ArgumentsHost } from '@nestjs/common';
import { UnsupportedServiceSearchOptionsException } from '../../integrations/pvog/serviceSearch/UnsupportedServiceSearchOptionsException';
import { UnsupportedSearchOptionsFilter } from './UnsupportedSearchOptionsFilter';

describe('UnsupportedSearchOptionsFilter', () => {
  it('answers 400 in the request-validation shape', () => {
    const sent: { status?: number; body?: unknown } = {};
    const response = {
      status(code: number) {
        sent.status = code;
        return response;
      },
      json(body: unknown) {
        sent.body = body;
      },
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    new UnsupportedSearchOptionsFilter().catch(
      new UnsupportedServiceSearchOptionsException([
        'validDate is not supported by the configured service search',
      ]),
      host,
    );

    expect(sent.status).toBe(400);
    expect(sent.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['validDate is not supported by the configured service search'],
    });
  });
});
