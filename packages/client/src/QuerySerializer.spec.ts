import { serializeQuery } from './QuerySerializer.js';

describe('serializeQuery', () => {
  it('omits undefined and null, keeps false and 0', () => {
    expect(
      serializeQuery({
        a: undefined,
        b: null,
        fuzzySearch: false,
        page: 0,
        size: 10,
        query: 'Wohnsitz anmelden',
      }),
    ).toBe('fuzzySearch=false&page=0&size=10&query=Wohnsitz+anmelden');
  });

  it('repeats the key for arrays and skips empty arrays', () => {
    expect(
      serializeQuery({
        lifeSituationCodes: ['1010000', '1020000'],
        serviceCatalogKeys: [],
        flags: [true, false],
        numbers: [0, 1],
      }),
    ).toBe(
      'lifeSituationCodes=1010000&lifeSituationCodes=1020000&flags=true&flags=false&numbers=0&numbers=1',
    );
  });

  it('sends dates as ISO 8601 timestamps and encodes reserved characters', () => {
    expect(
      serializeQuery({
        validDate: new Date('2026-09-30T00:00:00.000Z'),
        term: 'Kosten & Gebühren',
      }),
    ).toBe(
      'validDate=2026-09-30T00%3A00%3A00.000Z&term=Kosten+%26+Geb%C3%BChren',
    );
  });

  it('returns an empty string without parameters', () => {
    expect(serializeQuery({})).toBe('');
    expect(serializeQuery({ a: undefined })).toBe('');
  });
});
