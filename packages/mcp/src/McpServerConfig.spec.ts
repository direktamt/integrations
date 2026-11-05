import { readMcpServerConfig } from './McpServerConfig';

describe('readMcpServerConfig', () => {
  it('defaults to the locally started API', () => {
    expect(readMcpServerConfig({})).toEqual({
      apiBaseUrl: 'http://localhost:3000',
    });
    expect(readMcpServerConfig({ DIREKTAMT_API_BASE_URL: ' ' })).toEqual({
      apiBaseUrl: 'http://localhost:3000',
    });
  });

  it('takes the base URL from DIREKTAMT_API_BASE_URL', () => {
    expect(
      readMcpServerConfig({
        DIREKTAMT_API_BASE_URL: 'https://api.example.test/integrations',
      }),
    ).toEqual({ apiBaseUrl: 'https://api.example.test/integrations' });
  });

  it.each(['localhost:3000', 'ftp://api.example.test', 'not a url'])(
    'rejects %s',
    (value) => {
      expect(() =>
        readMcpServerConfig({ DIREKTAMT_API_BASE_URL: value }),
      ).toThrow('DIREKTAMT_API_BASE_URL must be an http(s) URL');
    },
  );
});
