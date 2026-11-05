import { SectionCard } from '@direktamt/ui-kit';
import { Box, Button, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useResolveLocation } from '../../api/queries/useLocationQueries';
import { EndpointChip } from '../../components/EndpointChip';
import { FormRow } from '../../components/FormRow';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';
import { LocationResultTable } from './LocationResultTable';

/**
 * GET /locations — resolve city name / postal code to territories.
 * At least one criterion required, mirroring integrations API validation.
 */
export function LocationResolvePanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cityName = searchParams.get('resolveCityName') ?? '';
  const postalCode = searchParams.get('resolvePostalCode') ?? '';
  const [cityInput, setCityInput] = useState(cityName);
  const [postalInput, setPostalInput] = useState(postalCode);
  const [localError, setLocalError] = useState<string | null>(null);

  // Committed URL values are the source of truth: re-sync the drafts when the
  // URL changes through Back/Forward, a deep link or programmatic navigation.
  useEffect(() => {
    setCityInput(cityName);
  }, [cityName]);
  useEffect(() => {
    setPostalInput(postalCode);
  }, [postalCode]);

  const resolveQuery = useResolveLocation(
    cityName || undefined,
    postalCode || undefined,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cityInput && !postalInput) {
      setLocalError('Provide a city name or a postal code.');
      return;
    }
    setLocalError(null);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (cityInput) {
        next.set('resolveCityName', cityInput);
      } else {
        next.delete('resolveCityName');
      }
      if (postalInput) {
        next.set('resolvePostalCode', postalInput);
      } else {
        next.delete('resolvePostalCode');
      }
      return next;
    });
  };

  return (
    <SectionCard
      title="Resolve"
      description="City name or postal code to territories; at least one of the two criteria is required."
      actions={<EndpointChip path="/locations" />}
    >
      <form onSubmit={submit}>
        <FormRow>
          <TextField
            label="City name"
            size="small"
            value={cityInput}
            error={Boolean(localError)}
            onChange={(event) => setCityInput(event.target.value)}
          />
          <TextField
            label="Postal code"
            size="small"
            value={postalInput}
            error={Boolean(localError)}
            helperText={localError}
            onChange={(event) => setPostalInput(event.target.value)}
          />
          <Button type="submit" variant="contained">
            Resolve
          </Button>
        </FormRow>
      </form>
      <ValidationErrorAlert error={resolveQuery.error} />
      <Box sx={{ mt: 2.5 }}>
        <QueryStateGate
          query={resolveQuery}
          idleMessage="Submit a city name or postal code."
          isEmpty={(locations) => locations.length === 0}
          dense
        >
          {(locations) => <LocationResultTable locations={locations} />}
        </QueryStateGate>
      </Box>
    </SectionCard>
  );
}
