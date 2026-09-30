import { Stack } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
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
