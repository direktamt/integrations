import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SearchServicesQuery } from './SearchServicesQuery';

function failingProperties(query: Record<string, unknown>): string[] {
  return validateSync(plainToInstance(SearchServicesQuery, query)).map(
    (error) => error.property,
  );
}

const VALID = { regionalKey: '053150000000', query: 'Wohnsitz anmelden' };

describe('SearchServicesQuery', () => {
  it('accepts the documented upstream ranges', () => {
    expect(failingProperties({ ...VALID, size: '5', page: '0' })).toEqual([]);
    expect(failingProperties({ ...VALID, size: '9999', page: '100' })).toEqual(
      [],
    );
  });

  it('applies the API defaults when the optional fields are absent', () => {
    const query = plainToInstance(SearchServicesQuery, VALID);

    expect(query.size).toBe(10);
    expect(query.page).toBe(0);
    expect(query.fuzzySearch).toBe(true);
    expect(query.useRegionalHierarchy).toBe(true);
  });

  it('rejects a size outside 5..9999 before the upstream is called', () => {
    expect(failingProperties({ ...VALID, size: '4' })).toEqual(['size']);
    expect(failingProperties({ ...VALID, size: '10000' })).toEqual(['size']);
  });

  it('rejects a page above 100', () => {
    expect(failingProperties({ ...VALID, page: '101' })).toEqual(['page']);
  });

  it('turns explicit false strings into false', () => {
    const query = plainToInstance(SearchServicesQuery, {
      ...VALID,
      fuzzySearch: 'false',
      useRegionalHierarchy: 'false',
    });

    expect(query.fuzzySearch).toBe(false);
    expect(query.useRegionalHierarchy).toBe(false);
  });
});
