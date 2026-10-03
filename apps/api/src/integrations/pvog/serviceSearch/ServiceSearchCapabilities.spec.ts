import { findUnsupportedServiceSearchOptions } from './ServiceSearchCapabilities';

const FULL = {
  maxPageSize: 9999,
  supportsExactSearch: true,
  supportsValidDate: true,
};
const REDUCED = {
  maxPageSize: 50,
  supportsExactSearch: false,
  supportsValidDate: false,
};
const options = {
  size: 10,
  page: 0,
  fuzzySearch: true,
  useRegionalHierarchy: true,
};

describe('findUnsupportedServiceSearchOptions', () => {
  it('accepts everything under full capabilities', () => {
    expect(
      findUnsupportedServiceSearchOptions(
        { ...options, size: 9999, fuzzySearch: false, validDate: '2026-10-03' },
        FULL,
      ),
    ).toEqual([]);
  });

  it('accepts the defaults under reduced capabilities', () => {
    expect(
      findUnsupportedServiceSearchOptions({ ...options, size: 50 }, REDUCED),
    ).toEqual([]);
  });

  it('names every option the adapter cannot honour', () => {
    expect(
      findUnsupportedServiceSearchOptions(
        { ...options, size: 51, fuzzySearch: false, validDate: '2026-10-03' },
        REDUCED,
      ),
    ).toEqual([
      expect.stringMatching(/^size must not be greater than 50/),
      expect.stringMatching(/^fuzzySearch must be true/),
      expect.stringMatching(/^validDate is not supported/),
    ]);
  });
});
