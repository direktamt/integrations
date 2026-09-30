import {
  parsePvogServiceSearchVersion,
  PvogServiceSearchVersion,
} from './PvogServiceSearchVersion';

describe('parsePvogServiceSearchVersion', () => {
  it.each([undefined, '', '  '])('defaults to v7 for %p', (value) => {
    expect(parsePvogServiceSearchVersion(value)).toBe(
      PvogServiceSearchVersion.V7,
    );
  });

  it('accepts the known versions verbatim', () => {
    expect(parsePvogServiceSearchVersion('v7')).toBe(
      PvogServiceSearchVersion.V7,
    );
    expect(parsePvogServiceSearchVersion('v8beta1')).toBe(
      PvogServiceSearchVersion.V8Beta1,
    );
  });

  it.each(['v8', 'V7', 'v8beta2', 'latest'])(
    'rejects %p as a configuration error',
    (value) => {
      expect(() => parsePvogServiceSearchVersion(value)).toThrow(
        /PVOG_SERVICE_SEARCH_VERSION must be one of v7, v8beta1/,
      );
    },
  );
});
