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
import { useLocation } from '../../api/queries/useLocationQueries';
import { QueryStateGate } from '../../components/QueryStateGate';
import { LocationResultTable } from './LocationResultTable';

/**
 * GET /locations/{regionalKey} — reverse lookup of a territory;
 * a 404 renders inline.
 */
export function LocationReverseLookupPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const regionalKey = searchParams.get('lookupRegionalKey') ?? '';
  const [input, setInput] = useState(regionalKey);

  // Committed URL values are the source of truth: re-sync the drafts when the
  // URL changes through Back/Forward, a deep link or programmatic navigation.
  useEffect(() => {
    setInput(regionalKey);
  }, [regionalKey]);

  const locationQuery = useLocation(regionalKey);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (input) {
        next.set('lookupRegionalKey', input);
      } else {
        next.delete('lookupRegionalKey');
      }
      return next;
    });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Reverse lookup
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          GET /locations/&#123;regionalKey&#125; — resolve a regional key back
          to its territory.
        </Typography>
        <form onSubmit={submit}>
          <Stack direction="row" spacing={2} sx={{ my: 1 }}>
            <TextField
              label="Regional key"
              size="small"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
            >
              Look up
            </Button>
          </Stack>
        </form>
        <QueryStateGate
          query={locationQuery}
          idleMessage="Submit a regional key."
        >
          {(location) => <LocationResultTable locations={[location]} />}
        </QueryStateGate>
      </CardContent>
    </Card>
  );
}
