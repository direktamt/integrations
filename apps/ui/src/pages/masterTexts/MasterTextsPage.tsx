import { EmptyState, PageHeader, SectionCard } from '@direktamt/ui-kit';
import { Button, Stack, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMasterText } from '../../api/queries/useMasterTextQueries';
import { EndpointList } from '../../components/EndpointList';
import { FormRow } from '../../components/FormRow';
import { JsonViewer } from '../../components/JsonViewer';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';

const DEFAULT_SOURCE = 'primary';

/**
 * GET /master-texts/{editorialOfficeId}/{serviceId}: upstream pass-through
 * JSON, rendered raw; a 404 is an inline state.
 */
export function MasterTextsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editorialOfficeId = searchParams.get('editorialOfficeId') ?? '';
  const serviceId = searchParams.get('serviceId') ?? '';
  const source = searchParams.get('source') ?? '';
  const [officeInput, setOfficeInput] = useState(editorialOfficeId);
  const [serviceInput, setServiceInput] = useState(serviceId);
  const [sourceInput, setSourceInput] = useState(source || DEFAULT_SOURCE);

  // Committed URL values are the source of truth: re-sync the drafts when the
  // URL changes through Back/Forward, a deep link or programmatic navigation.
  useEffect(() => {
    setOfficeInput(editorialOfficeId);
  }, [editorialOfficeId]);
  useEffect(() => {
    setServiceInput(serviceId);
  }, [serviceId]);
  useEffect(() => {
    setSourceInput(source || DEFAULT_SOURCE);
  }, [source]);

  const masterTextQuery = useMasterText(
    editorialOfficeId,
    serviceId,
    source || undefined,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (officeInput) next.set('editorialOfficeId', officeInput);
    if (serviceInput) next.set('serviceId', serviceInput);
    if (sourceInput && sourceInput !== DEFAULT_SOURCE)
      next.set('source', sourceInput);
    setSearchParams(next);
  };

  return (
    <>
      <PageHeader
        overline="Federal catalog (FIM)"
        title="Master texts"
        description="Parsed federal master texts (XZuFi) as published by the FIM Portal; unvalidated upstream pass-through."
      >
        <EndpointList
          paths={['/master-texts/{editorialOfficeId}/{serviceId}']}
        />
      </PageHeader>
      <Stack spacing={3}>
        <SectionCard title="Load">
          <form onSubmit={submit}>
            <FormRow>
              <TextField
                label="Editorial office id"
                size="small"
                required
                value={officeInput}
                onChange={(event) => setOfficeInput(event.target.value)}
              />
              <TextField
                label="Service id"
                size="small"
                required
                value={serviceInput}
                onChange={(event) => setServiceInput(event.target.value)}
              />
              <TextField
                label="Source"
                size="small"
                value={sourceInput}
                onChange={(event) => setSourceInput(event.target.value)}
                helperText={`Default: ${DEFAULT_SOURCE}`}
              />
              <Button type="submit" variant="contained">
                Load
              </Button>
            </FormRow>
          </form>
          <ValidationErrorAlert error={masterTextQuery.error} />
        </SectionCard>
        <QueryStateGate
          query={masterTextQuery}
          idleMessage="Provide an editorial office id and a service id."
          renderNotFound={() => (
            <EmptyState
              tone="info"
              title="Not found"
              description="No master text for this pair."
            />
          )}
        >
          {(masterText) => (
            <JsonViewer data={masterText} title="Master text" defaultExpanded />
          )}
        </QueryStateGate>
      </Stack>
    </>
  );
}
