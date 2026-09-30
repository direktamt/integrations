import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListServiceAuthoritiesQuery } from './ListServiceAuthoritiesQuery';

function failingProperties(query: Record<string, unknown>): string[] {
  return validateSync(plainToInstance(ListServiceAuthoritiesQuery, query)).map(
    (error) => error.property,
  );
}

describe('ListServiceAuthoritiesQuery', () => {
  it('requires a non-empty regional key', () => {
    expect(failingProperties({})).toEqual(['regionalKey']);
    expect(failingProperties({ regionalKey: '' })).toEqual(['regionalKey']);
    expect(failingProperties({ regionalKey: '053150000000' })).toEqual([]);
  });

  it('includes parent territories by default', () => {
    const query = plainToInstance(ListServiceAuthoritiesQuery, {
      regionalKey: '053150000000',
    });

    expect(query.useRegionalHierarchy).toBe(true);
  });

  it('turns an explicit false string into false', () => {
    const query = plainToInstance(ListServiceAuthoritiesQuery, {
      regionalKey: '053150000000',
      useRegionalHierarchy: 'false',
    });

    expect(query.useRegionalHierarchy).toBe(false);
  });
});
