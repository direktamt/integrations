import {
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useResolveLocation } from '../../api/queries/useLocationQueries';
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
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Resolve
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          GET /locations — at least one of the two criteria is required.
        </Typography>
        <form onSubmit={submit}>
          <Stack direction="row" spacing={2} sx={{ my: 1 }}>
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
            <Button
              type="submit"
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
            >
              Resolve
            </Button>
          </Stack>
        </form>
        <ValidationErrorAlert error={resolveQuery.error} />
        <QueryStateGate
          query={resolveQuery}
          idleMessage="Submit a city name or postal code."
          isEmpty={(locations) => locations.length === 0}
        >
          {(locations) => <LocationResultTable locations={locations} />}
        </QueryStateGate>
      </CardContent>
    </Card>
  );
}
