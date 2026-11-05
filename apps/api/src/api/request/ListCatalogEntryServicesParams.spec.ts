import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListCatalogEntryServicesParams } from './ListCatalogEntryServicesParams';

function failingProperties(params: Record<string, unknown>): string[] {
  return validateSync(
    plainToInstance(ListCatalogEntryServicesParams, params),
  ).map((error) => error.property);
}

describe('ListCatalogEntryServicesParams', () => {
  it('requires a 14-digit service catalog key', () => {
    expect(failingProperties({ serviceCatalogKey: '9911500510400' })).toEqual([
      'serviceCatalogKey',
    ]);
    expect(failingProperties({ serviceCatalogKey: '991150051040000' })).toEqual(
      ['serviceCatalogKey'],
    );
    expect(failingProperties({ serviceCatalogKey: 'TMP_05_1234567' })).toEqual([
      'serviceCatalogKey',
    ]);
    expect(failingProperties({ serviceCatalogKey: '99115005104000' })).toEqual(
      [],
    );
  });
});
