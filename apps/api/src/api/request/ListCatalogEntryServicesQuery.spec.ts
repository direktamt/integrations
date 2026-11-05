import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListCatalogEntryServicesQuery } from './ListCatalogEntryServicesQuery';

function failingProperties(query: Record<string, unknown>): string[] {
  return validateSync(
    plainToInstance(ListCatalogEntryServicesQuery, query),
  ).map((error) => error.property);
}

describe('ListCatalogEntryServicesQuery', () => {
  it('requires a 12-digit regional key', () => {
    expect(failingProperties({})).toEqual(['regionalKey']);
    expect(failingProperties({ regionalKey: '' })).toEqual(['regionalKey']);
    expect(failingProperties({ regionalKey: '05314' })).toEqual([
      'regionalKey',
    ]);
    expect(failingProperties({ regionalKey: '05314000000x' })).toEqual([
      'regionalKey',
    ]);
    expect(failingProperties({ regionalKey: '053140000000' })).toEqual([]);
  });
});
