import { PvogServiceSearchVersion } from './PvogServiceSearchVersion';
import { ServiceSearchProvider } from './ServiceSearchProvider';
import { selectServiceSearchProvider } from './ServiceSearchProviderSelection';

describe('selectServiceSearchProvider', () => {
  const v7 = { searchServices: jest.fn() } as ServiceSearchProvider;
  const v8beta1 = { searchServices: jest.fn() } as ServiceSearchProvider;
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
