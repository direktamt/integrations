import { sanitizeUrlForLogging } from './UrlSanitizer';

describe('sanitizeUrlForLogging', () => {
  it('keeps origin and path and drops every query value', () => {
    expect(
      sanitizeUrlForLogging(
        'https://upstream.test/api/v3/locations/details?ort=K%C3%B6ln&plz=50667',
      ),
    ).toBe('https://upstream.test/api/v3/locations/details');
  });

  it('drops fragments', () => {
    expect(sanitizeUrlForLogging('https://upstream.test/api/x#frag')).toBe(
      'https://upstream.test/api/x',
    );
  });

  it('cuts at the first question mark when the input is not a valid URL', () => {
    expect(sanitizeUrlForLogging('not a url?q=secret')).toBe('not a url');
  });

  it('drops query and fragment of a malformed URL in either order', () => {
    expect(sanitizeUrlForLogging('not a url?q=secret#frag=1')).toBe(
      'not a url',
    );
    expect(sanitizeUrlForLogging('not a url#frag?q=secret')).toBe('not a url');
  });
});
