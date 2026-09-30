import { Logger } from '@nestjs/common';
import { FetchStub } from '../../../test/FetchStub';
import { UpstreamContractViolationException } from '../common/exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../common/exceptions/UpstreamHttpException';
import { PvogRawClient } from './PvogRawClient';

/**
 * Synthetic JZuFi-shaped payload with provider field names, nesting, arrays,
 * nulls, numbers and booleans, so that "unchanged" is observable. Values
 * are invented.
 */
const JZUFI_SERVICE = {
  id: { value: '121407320', schemeAgencyID: 'L100002' },
  idSekundaer: [{ value: '99115005104000', schemeID: 'LEIKA_ID' }],
  modulText: [
    {
      leikaTextmodul: { code: '02', listURI: 'urn:xoev-de:fim:codeliste' },
      position: 1,
      text: [{ value: '<p>Anmeldung</p>', languageCode: 'de' }],
    },
  ],
  sprachversion: [{ languageCode: 'de', sprachbezeichnungDeutsch: 'Deutsch' }],
  gueltigkeit: null,
  kennzeichenOeffentlichAnzeigen: true,
  versionsinformation: { geaendertDatumZeit: '2026-01-01T00:00:00Z' },
};

describe('PvogRawClient', () => {
  const fetchStub = new FetchStub();
  const client = new PvogRawClient();
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeAll(() => {
    fetchStub.install();
  });

  afterAll(() => {
    fetchStub.restore();
  });

  beforeEach(() => {
    fetchStub.calls.length = 0;
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the service JZuFi unchanged inside the envelope', async () => {
    fetchStub.respondWithJson(JZUFI_SERVICE);

    const response = await client.getServiceDescriptionJzufi('L100002.LB.1');

    const url = fetchStub.lastUrl();
    expect(url.origin).toBe('https://pvog.fitko.net');
    expect(url.pathname).toBe(
      '/suchdienst/api/v1/servicedescriptions/L100002.LB.1/jzufi-2-3',
    );
    expect(url.search).toBe('');
    expect(fetchStub.calls[0].init?.headers).toEqual({
      Accept: 'application/json',
    });
    expect(response).toEqual({
      provider: 'PVOG',
      representation: 'jzufi-2-3',
      data: JZUFI_SERVICE,
    });
    expect(JSON.stringify(response.data)).toBe(JSON.stringify(JZUFI_SERVICE));
  });

  it('returns the online-service JZuFi from its own upstream path', async () => {
    const body = {
      bezeichnung: [{ value: 'Wohnsitz anmelden', languageCode: 'de' }],
      id: { value: '121797650', schemeAgencyID: 'L100002' },
      link: [{ uri: 'https://example.test/apply', languageCode: 'de' }],
      status: { code: '1' },
    };
    fetchStub.respondWithJson(body);

    const response = await client.getOnlineServiceJzufi('L100002.OD.1');

    expect(fetchStub.lastUrl().pathname).toBe(
      '/suchdienst/api/v1/onlineservices/L100002.OD.1/jzufi-2-3',
    );
    expect(response).toEqual({
      provider: 'PVOG',
      representation: 'jzufi-2-3',
      data: body,
    });
  });

  it.each([
    ['a JSON array', [1, 'two', null]],
    ['a JSON string', 'plain'],
    ['a JSON null', null],
  ])('passes %s through as it is', async (_label, body) => {
    fetchStub.respondWithJson(body);

    const response = await client.getServiceDescriptionJzufi('L100002.LB.1');

    expect(response.data).toEqual(body);
  });

  it('keeps the id inside its path segment', async () => {
    fetchStub.respondWithJson({});

    await client.getServiceDescriptionJzufi('../x/y?z=1#f');

    const url = fetchStub.lastUrl();
    expect(url.pathname).toBe(
      '/suchdienst/api/v1/servicedescriptions/..%2Fx%2Fy%3Fz%3D1%23f/jzufi-2-3',
    );
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });

  it('rejects a body that is not JSON as a contract violation', async () => {
    fetchStub.respondWithText('<html>maintenance</html>');

    await expect(
      client.getServiceDescriptionJzufi('L100002.LB.1'),
    ).rejects.toBeInstanceOf(UpstreamContractViolationException);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('passes an upstream 404 through', async () => {
    fetchStub.respondWithJson({ code: 'NOT_FOUND' }, 404);

    const failure = client.getOnlineServiceJzufi('L100002.OD.gone');

    await expect(failure).rejects.toBeInstanceOf(UpstreamHttpException);
    await expect(failure).rejects.toMatchObject({ status: 404 });
  });

  it('passes a provider 5xx through as an upstream HTTP failure', async () => {
    fetchStub.respondWithText('service unavailable', 503);

    const failure = client.getServiceDescriptionJzufi('L100002.LB.1');

    await expect(failure).rejects.toBeInstanceOf(UpstreamHttpException);
    await expect(failure).rejects.toMatchObject({ status: 503 });
  });

  it('logs only the origin and path, never a query string', async () => {
    fetchStub.respondWithText('nope', 500);

    await expect(
      client.getServiceDescriptionJzufi('L100002.LB.1'),
    ).rejects.toBeInstanceOf(UpstreamHttpException);

    const logged = (warnSpy.mock.calls as unknown[][])
      .concat(errorSpy.mock.calls as unknown[][])
      .flat()
      .map(String)
      .join('\n');
    expect(logged).toContain(
      'https://pvog.fitko.net/suchdienst/api/v1/servicedescriptions/L100002.LB.1/jzufi-2-3',
    );
    expect(logged).not.toContain('?');
    expect(logged).not.toContain('nope');
  });
});
