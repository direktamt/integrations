import { PageHeader } from '@direktamt/ui-kit';
import { Stack } from '@mui/material';
import { LocationResolvePanel } from './LocationResolvePanel';
import { LocationReverseLookupPanel } from './LocationReverseLookupPanel';
import { LocationSuggestPanel } from './LocationSuggestPanel';

/**
 * Three panels, one per /locations endpoint.
 */
export function LocationsPage() {
  return (
    <>
      <PageHeader
        overline="Territories"
        title="Locations"
        description="City autocomplete, resolution to regional keys (ARS) and reverse lookup."
      />
      <Stack spacing={3}>
        <LocationSuggestPanel />
        <LocationResolvePanel />
        <LocationReverseLookupPanel />
      </Stack>
    </>
  );
}
