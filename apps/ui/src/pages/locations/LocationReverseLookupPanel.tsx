import { SectionCard } from '@direktamt/ui-kit';
import { Box, Button, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useLocation } from '../../api/queries/useLocationQueries';
import { EndpointChip } from '../../components/EndpointChip';
import { FormRow } from '../../components/FormRow';
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
    <SectionCard
      title="Reverse lookup"
      description="Resolve a regional key back to its territory."
      actions={<EndpointChip path="/locations/{regionalKey}" />}
    >
      <form onSubmit={submit}>
        <FormRow>
          <TextField
            label="Regional key"
            size="small"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button type="submit" variant="contained">
            Look up
          </Button>
        </FormRow>
      </form>
      <Box sx={{ mt: 2.5 }}>
        <QueryStateGate
          query={locationQuery}
          idleMessage="Submit a regional key."
          dense
        >
          {(location) => <LocationResultTable locations={[location]} />}
        </QueryStateGate>
      </Box>
    </SectionCard>
  );
}
