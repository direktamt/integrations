import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { GetServiceContextQuery } from './GetServiceContextQuery';

function failingProperties(query: Record<string, unknown>): string[] {
  return validateSync(plainToInstance(GetServiceContextQuery, query)).map(
    (error) => error.property,
  );
}

describe('GetServiceContextQuery', () => {
  it('requires a non-empty regional key', () => {
    expect(failingProperties({})).toEqual(['regionalKey']);
    expect(failingProperties({ regionalKey: '053150000000' })).toEqual([]);
  });

  it('includes parent territories by default and honours an explicit false', () => {
    expect(
      plainToInstance(GetServiceContextQuery, { regionalKey: '053150000000' })
        .useRegionalHierarchy,
    ).toBe(true);
    expect(
      plainToInstance(GetServiceContextQuery, {
        regionalKey: '053150000000',
        useRegionalHierarchy: 'false',
      }).useRegionalHierarchy,
    ).toBe(false);
  });
});
