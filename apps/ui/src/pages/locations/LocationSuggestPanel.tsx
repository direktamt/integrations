import { SectionCard } from '@direktamt/ui-kit';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSuggestLocations } from '../../api/queries/useLocationQueries';
import { EndpointChip } from '../../components/EndpointChip';

const DEBOUNCE_MS = 300;

/**
 * GET /locations/suggestions — debounced autocomplete over live
 * suggestions with relevance scores.
 */
export function LocationSuggestPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('suggestQuery') ?? '';
  const [input, setInput] = useState(query);
  // Last value this panel wrote to the URL; lets the sync effect tell its own
  // debounced writes apart from external navigation (Back/Forward, deep link).
  const lastCommitted = useRef(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      lastCommitted.current = input;
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (input) {
            next.set('suggestQuery', input);
          } else {
            next.delete('suggestQuery');
          }
          return next;
        },
        { replace: true },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, setSearchParams]);

  useEffect(() => {
    if (query !== lastCommitted.current) {
      lastCommitted.current = query;
      setInput(query);
    }
  }, [query]);

  const suggestionsQuery = useSuggestLocations(query);

  return (
    <SectionCard
      title="Suggest"
      description="Autocomplete for a partial city name or postal code, with relevance scores."
      actions={<EndpointChip path="/locations/suggestions" />}
    >
      <Autocomplete
        freeSolo
        options={suggestionsQuery.data ?? []}
        getOptionLabel={(option) =>
          typeof option === 'string' ? option : option.name
        }
        filterOptions={(options) => options}
        loading={suggestionsQuery.isFetching}
        inputValue={input}
        onInputChange={(_, newInput) => setInput(newInput)}
        noOptionsText={query ? 'No suggestions.' : 'Type to get suggestions.'}
        renderOption={(props, option) => (
          <li {...props} key={`${option.name}-${option.relevance}`}>
            <Stack>
              <Typography variant="body2">{option.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                relevance {option.relevance}
              </Typography>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} label="Query" size="small" />
        )}
        sx={{ maxWidth: 420 }}
      />
    </SectionCard>
  );
}
