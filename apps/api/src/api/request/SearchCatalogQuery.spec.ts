import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SearchCatalogQuery } from './SearchCatalogQuery';

function failingProperties(query: Record<string, unknown>): string[] {
  return validateSync(plainToInstance(SearchCatalogQuery, query)).map(
    (error) => error.property,
  );
}

describe('SearchCatalogQuery', () => {
  it('accepts the documented upstream range for limit', () => {
    expect(failingProperties({ term: 'Anmeldung', limit: '1' })).toEqual([]);
    expect(failingProperties({ term: 'Anmeldung', limit: '200' })).toEqual([]);
  });

  it('rejects a limit outside 1..200 before the upstream is called', () => {
    expect(failingProperties({ term: 'Anmeldung', limit: '0' })).toEqual([
      'limit',
    ]);
    expect(failingProperties({ term: 'Anmeldung', limit: '201' })).toEqual([
      'limit',
    ]);
  });

  it('rejects a negative offset and an empty term', () => {
    expect(failingProperties({ term: 'Anmeldung', offset: '-1' })).toEqual([
      'offset',
    ]);
    expect(failingProperties({ term: '' })).toEqual(['term']);
  });
});
