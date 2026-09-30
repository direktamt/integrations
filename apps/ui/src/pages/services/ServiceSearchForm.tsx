import {
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { SearchServicesParams } from '../../api/queries/useServiceQueries';
import { KeyListField } from '../../components/KeyListField';

interface ServiceSearchFormProps {
  initialValues: SearchServicesParams;
  onSubmit: (values: SearchServicesParams) => void;
}

/**
 * Exposes every GET /services parameter; defaults match the integrations API
 * (optional params are sent only when set).
 */
export function ServiceSearchForm({
  initialValues,
  onSubmit,
}: ServiceSearchFormProps) {
  const [regionalKey, setRegionalKey] = useState(initialValues.regionalKey);
  const [query, setQuery] = useState(initialValues.query);
  const [size, setSize] = useState(initialValues.size?.toString() ?? '');
  const [fuzzySearch, setFuzzySearch] = useState(
    initialValues.fuzzySearch ?? false,
  );
  const [useRegionalHierarchy, setUseRegionalHierarchy] = useState(
    initialValues.useRegionalHierarchy ?? false,
  );
  const [lifeSituationCodes, setLifeSituationCodes] = useState<string[]>(
    initialValues.lifeSituationCodes ?? [],
  );
  const [validDate, setValidDate] = useState(initialValues.validDate ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      regionalKey,
      query,
      size: size ? Number(size) : undefined,
      page: 0,
      fuzzySearch: fuzzySearch || undefined,
      useRegionalHierarchy: useRegionalHierarchy || undefined,
      lifeSituationCodes: lifeSituationCodes.length
        ? lifeSituationCodes
        : undefined,
      validDate: validDate || undefined,
    });
  };

  return (
    <form onSubmit={submit}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            label="Regional key"
            size="small"
            required
            value={regionalKey}
            onChange={(event) => setRegionalKey(event.target.value)}
          />
          <TextField
            label="Query"
            size="small"
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ minWidth: 280 }}
          />
          <TextField
            label="Size"
            size="small"
            type="number"
            value={size}
            onChange={(event) => setSize(event.target.value)}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { min: 5 } }}
          />
          <KeyListField
            label="Life situation codes"
            value={lifeSituationCodes}
            onChange={setLifeSituationCodes}
          />
          <TextField
            label="Valid date"
            size="small"
            type="date"
            value={validDate}
            onChange={(event) => setValidDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={fuzzySearch}
                onChange={(event) => setFuzzySearch(event.target.checked)}
              />
            }
            label="Fuzzy search"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={useRegionalHierarchy}
                onChange={(event) =>
                  setUseRegionalHierarchy(event.target.checked)
                }
              />
            }
            label="Use regional hierarchy"
          />
          <Button type="submit" variant="contained">
            Search
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
