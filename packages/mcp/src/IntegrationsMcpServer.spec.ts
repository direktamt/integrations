import {
  callTool,
  connectServer,
  json,
  resultText,
  stubFetch,
  type ConnectedServer,
} from '../test/McpTestSupport';
import { TOOL_CATALOG } from './tools/ToolCatalog';

const BONN = '053140000000';
const SERVICE = 'L100002.LB.121407320';

describe('IntegrationsMcpServer', () => {
  let connected: ConnectedServer | undefined;

  afterEach(async () => {
    await connected?.close();
    connected = undefined;
  });

  it('lists one read-only tool per catalog entry with a description and an input schema', async () => {
    connected = await connectServer(stubFetch());

    const { tools } = await connected.client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual(
      TOOL_CATALOG.map((tool) => tool.name),
    );
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.title).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    }
  });

  it('reports the server name, version and usage instructions', async () => {
    connected = await connectServer(stubFetch());

    expect(connected.client.getServerVersion()).toEqual({
      name: 'direktamt-integrations',
      version: '0.1.0',
    });
    expect(connected.client.getInstructions()).toContain('resolveLocation');
  });

  it.each([
    ['suggestLocations', { query: 'Bo' }, '/locations/suggestions', 'query=Bo'],
    [
      'resolveLocation',
      { cityName: 'Bonn', postalCode: '53111' },
      '/locations',
      'cityName=Bonn&postalCode=53111',
    ],
    ['getLocation', { regionalKey: BONN }, `/locations/${BONN}`, ''],
    [
      'searchServices',
      {
        regionalKey: BONN,
        query: 'Wohnsitz anmelden',
        size: 5,
        page: 0,
        fuzzySearch: false,
        useRegionalHierarchy: false,
        lifeSituationCodes: ['1010000', '1020000'],
        validDate: '2026-11-05',
      },
      '/services',
      `regionalKey=${BONN}&query=Wohnsitz+anmelden&size=5&page=0&fuzzySearch=false&useRegionalHierarchy=false&lifeSituationCodes=1010000&lifeSituationCodes=1020000&validDate=2026-11-05`,
    ],
    [
      'getService',
      { id: SERVICE, regionalKey: BONN },
      `/services/${SERVICE}`,
      `regionalKey=${BONN}`,
    ],
    [
      'listServiceAuthorities',
      { id: SERVICE, regionalKey: BONN, useRegionalHierarchy: false },
      `/services/${SERVICE}/authorities`,
      `regionalKey=${BONN}&useRegionalHierarchy=false`,
    ],
    [
      'getServiceContext',
      { id: SERVICE, regionalKey: BONN },
      `/services/${SERVICE}/context`,
      `regionalKey=${BONN}`,
    ],
    [
      'listOnlineServices',
      { regionalKey: BONN, serviceCatalogKeys: ['99115005104000'] },
      '/online-services',
      `regionalKey=${BONN}&serviceCatalogKeys=99115005104000`,
    ],
    [
      'listOnlineServiceAuthorities',
      { id: 'L100002.OD.121797650' },
      '/online-services/L100002.OD.121797650/authorities',
      '',
    ],
    [
      'searchCatalog',
      { term: 'Anmeldung', limit: 20, offset: 0 },
      '/catalog',
      'term=Anmeldung&limit=20&offset=0',
    ],
    [
      'getCatalogEntry',
      { serviceCatalogKey: '99115005104000' },
      '/catalog/99115005104000',
      '',
    ],
    [
      'getMasterText',
      { editorialOfficeId: 'B100019', serviceId: '582787', source: 'primary' },
      '/master-texts/B100019/582787',
      'source=primary',
    ],
  ])(
    '%s calls its endpoint and returns the contract unchanged',
    async (name, args, path, query) => {
      const body = { echo: name, nested: [{ html: '<p>Text</p>' }] };
      const fetch = stubFetch(() => json(body));
      connected = await connectServer(fetch);

      const result = await callTool(connected.client, name, args);

      expect(result.isError).toBeFalsy();
      expect(JSON.parse(resultText(result))).toEqual(body);
      expect(fetch.calls).toHaveLength(1);
      expect(fetch.calls[0].url.pathname).toBe(path);
      expect(fetch.calls[0].url.searchParams.toString()).toBe(query);
      expect(fetch.calls[0].init.signal).toBeInstanceOf(AbortSignal);
    },
  );

  it('has a mapping test for every tool', () => {
    // Keeps the table above complete when a tool is added.
    expect(TOOL_CATALOG).toHaveLength(12);
  });

  it('maps an API 404 to a notFound tool error', async () => {
    connected = await connectServer(
      stubFetch(() =>
        json(
          {
            statusCode: 404,
            error: 'Not Found',
            message: 'Unknown regional key: 000000000000',
          },
          404,
        ),
      ),
    );

    const result = await callTool(connected.client, 'getLocation', {
      regionalKey: '000000000000',
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe(
      'notFound: the integrations API answered HTTP 404 (Not Found): Unknown regional key: 000000000000.',
    );
  });

  it('maps an upstream outage to a retryable upstreamUnavailable tool error', async () => {
    connected = await connectServer(
      stubFetch(() =>
        json(
          {
            statusCode: 504,
            error: 'UpstreamTimeoutException',
            message: 'The government data source did not respond in time.',
          },
          504,
        ),
      ),
    );

    const result = await callTool(connected.client, 'searchServices', {
      regionalKey: BONN,
      query: 'Hund',
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe(
      'upstreamUnavailable: the integrations API answered HTTP 504 (UpstreamTimeoutException): The government data source did not respond in time. Retrying later may succeed.',
    );
  });

  it('maps an unreachable API to an apiUnreachable tool error', async () => {
    connected = await connectServer(
      stubFetch(() => Promise.reject(new TypeError('fetch failed'))),
    );

    const result = await callTool(connected.client, 'getLocation', {
      regionalKey: BONN,
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/^apiUnreachable: /);
  });

  it('rejects invalid arguments as a tool error without calling the API', async () => {
    const fetch = stubFetch();
    connected = await connectServer(fetch);

    const missing = await callTool(connected.client, 'getService', {
      id: SERVICE,
    });
    const unknown = await callTool(connected.client, 'getLocation', {
      regionalKey: BONN,
      regionKey: BONN,
    });
    const outOfRange = await callTool(connected.client, 'searchServices', {
      regionalKey: BONN,
      query: 'Hund',
      size: 4,
    });

    for (const result of [missing, unknown, outOfRange]) {
      expect(result.isError).toBe(true);
      expect(resultText(result)).toMatch(/Input validation error/);
    }
    expect(resultText(missing)).toMatch(/regionalKey/);
    expect(resultText(unknown)).toMatch(/regionKey/);
    expect(resultText(outOfRange)).toMatch(/size/);
    expect(fetch.calls).toHaveLength(0);
  });

  it('keeps an API validation answer of 400 as an invalidArguments tool error', async () => {
    connected = await connectServer(
      stubFetch(() =>
        json(
          {
            statusCode: 400,
            error: 'Bad Request',
            message: [
              'cityName should not be empty',
              'postalCode should not be empty',
            ],
          },
          400,
        ),
      ),
    );

    const result = await callTool(connected.client, 'resolveLocation', {});

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe(
      'invalidArguments: the integrations API answered HTTP 400 (Bad Request): cityName should not be empty; postalCode should not be empty.',
    );
  });
});
