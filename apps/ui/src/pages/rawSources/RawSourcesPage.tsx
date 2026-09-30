import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  useRawPvogJzufi,
  type RawPvogResource,
} from '../../api/queries/useRawSourceQueries';
import { JsonViewer } from '../../components/JsonViewer';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';

const RESOURCES: { value: RawPvogResource; label: string }[] = [
  { value: 'services', label: 'Service description' },
  { value: 'online-services', label: 'Online service' },
];

function parseResource(value: string | null): RawPvogResource {
  return value === 'online-services' ? 'online-services' : 'services';
}

/**
 * GET /raw/pvog/{resource}/{id}/jzufi-2-3: the provider's own JZuFi 2.3
 * JSON, shown as it is. `resource` and `id` live in the URL.
 */
export function RawSourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resource = parseResource(searchParams.get('resource'));
  const id = searchParams.get('id') ?? '';
  const [resourceInput, setResourceInput] = useState<RawPvogResource>(resource);
  const [idInput, setIdInput] = useState(id);

  // Committed URL values are the source of truth: re-sync the drafts when the
  // URL changes through Back/Forward, a deep link or programmatic navigation.
  useEffect(() => {
    setResourceInput(resource);
  }, [resource]);
  useEffect(() => {
    setIdInput(id);
  }, [id]);

  const rawQuery = useRawPvogJzufi(resource, id);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (resourceInput !== 'services') next.set('resource', resourceInput);
    if (idInput) next.set('id', idInput);
    setSearchParams(next);
  };

  return (
    <>
      <PageHeader
        title="Raw sources"
        description="Provider representations as delivered by PVOG (JZuFi 2.3); not normalized, no compatibility guarantee."
      />
      <form onSubmit={submit}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            label="Resource"
            size="small"
            value={resourceInput}
            onChange={(event) =>
              setResourceInput(parseResource(event.target.value))
            }
            sx={{ minWidth: 220 }}
          >
            {RESOURCES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="PVOG id"
            size="small"
            required
            value={idInput}
            onChange={(event) => setIdInput(event.target.value)}
            sx={{ minWidth: 280 }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
          >
            Load
          </Button>
        </Stack>
      </form>
      <ValidationErrorAlert error={rawQuery.error} />
      <QueryStateGate
        query={rawQuery}
        idleMessage="Provide a PVOG id of a service description or an online service."
        renderNotFound={() => (
          <Alert severity="info">
            PVOG has no JZuFi representation for this id.
          </Alert>
        )}
      >
        {(response) => (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Envelope
              </Typography>
              <Chip label={`provider: ${response.provider}`} size="small" />
              <Chip
                label={`representation: ${response.representation}`}
                size="small"
              />
            </Stack>
            <JsonViewer
              data={response.data}
              title="Raw JZuFi 2.3 body (upstream field names)"
              defaultExpanded
            />
          </Stack>
        )}
      </QueryStateGate>
    </>
  );
}
