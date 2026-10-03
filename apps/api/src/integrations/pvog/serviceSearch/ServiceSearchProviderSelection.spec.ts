import { PvogServiceSearchVersion } from './PvogServiceSearchVersion';
import { ServiceSearchProvider } from './ServiceSearchProvider';
import { selectServiceSearchProvider } from './ServiceSearchProviderSelection';

describe('selectServiceSearchProvider', () => {
  const capabilities = {
    maxPageSize: 9999,
    supportsExactSearch: true,
    supportsValidDate: true,
  };
  const v7: ServiceSearchProvider = { capabilities, searchServices: jest.fn() };
  const v8beta1: ServiceSearchProvider = {
    capabilities,
    searchServices: jest.fn(),
  };
  const providers = { v7, v8beta1 };

  it('selects the v7 adapter for the default version', () => {
    expect(
      selectServiceSearchProvider(PvogServiceSearchVersion.V7, providers),
    ).toBe(v7);
  });

  it('selects the v8beta1 adapter only when configured', () => {
    expect(
      selectServiceSearchProvider(PvogServiceSearchVersion.V8Beta1, providers),
    ).toBe(v8beta1);
  });
});
