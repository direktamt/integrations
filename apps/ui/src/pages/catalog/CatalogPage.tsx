import { PageHeader, SectionCard } from '@direktamt/ui-kit';
import type { CatalogEntry } from '@direktamt/integrations-contracts';
import { Box, Button, Stack, TablePagination, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSearchCatalog } from '../../api/queries/useCatalogQueries';
import { DataTable } from '../../components/DataTable';
import { EndpointList } from '../../components/EndpointList';
import { FormRow } from '../../components/FormRow';
import { KeyChip } from '../../components/KeyChip';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';
import { CatalogEntryDialog } from './CatalogEntryDialog';

const DEFAULT_LIMIT = 20;

/**
 * GET /catalog — federal service catalog search with offset pagination;
 * row click opens the full entry in a dialog.
 */
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const term = searchParams.get('term') ?? '';
  const limit = searchParams.has('limit')
    ? Number(searchParams.get('limit'))
    : DEFAULT_LIMIT;
  const offset = searchParams.has('offset')
    ? Number(searchParams.get('offset'))
    : 0;
  const selectedKey = searchParams.get('selected') ?? '';
  const limitParam = searchParams.get('limit') ?? '';
  const [termInput, setTermInput] = useState(term);
  const [limitInput, setLimitInput] = useState(limitParam);

  // Committed URL values are the source of truth: re-sync the drafts when the
  // URL changes through Back/Forward, a deep link or programmatic navigation.
  useEffect(() => {
    setTermInput(term);
  }, [term]);
  useEffect(() => {
    setLimitInput(limitParam);
  }, [limitParam]);

  const catalogQuery = useSearchCatalog(term, limit, offset);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (termInput) next.set('term', termInput);
    if (limitInput) next.set('limit', limitInput);
    setSearchParams(next);
  };

  const updateParam = (name: string, value: string | null) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === null) {
        next.delete(name);
      } else {
        next.set(name, value);
      }
      return next;
    });
  };

  return (
    <>
      <PageHeader
        overline="Federal catalog (FIM)"
        title="Catalog"
        description="Federal LeiKa service catalog — canonical service IDs and synonyms."
      >
        <EndpointList paths={['/catalog', '/catalog/{serviceCatalogKey}']} />
      </PageHeader>
      <Stack spacing={3}>
        <SectionCard title="Search">
          <form onSubmit={submit}>
            <FormRow>
              <TextField
                label="Term"
                size="small"
                required
                value={termInput}
                onChange={(event) => setTermInput(event.target.value)}
                sx={{ minWidth: { md: 320 } }}
              />
              <TextField
                label="Limit"
                size="small"
                type="number"
                value={limitInput}
                onChange={(event) => setLimitInput(event.target.value)}
                sx={{ width: { md: 110 } }}
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <Button type="submit" variant="contained">
                Search
              </Button>
            </FormRow>
          </form>
          <ValidationErrorAlert error={catalogQuery.error} />
        </SectionCard>
        <QueryStateGate
          query={catalogQuery}
          idleMessage="Provide a search term."
          isEmpty={(result) => result.entries.length === 0}
        >
          {(result) => (
            <DataTable
              caption={`${result.totalCount} catalog entries`}
              columns={[
                {
                  header: 'Service catalog key',
                  render: (entry: CatalogEntry) => (
                    <KeyChip value={entry.serviceCatalogKey} />
                  ),
                },
                {
                  header: 'Title',
                  render: (entry: CatalogEntry) => (
                    <Box sx={{ fontWeight: 500 }}>{entry.title}</Box>
                  ),
                },
                {
                  header: 'Citizen-facing name',
                  render: (entry: CatalogEntry) => entry.citizenFacingName,
                },
                {
                  header: 'Service type',
                  render: (entry: CatalogEntry) => entry.serviceType,
                },
                {
                  header: 'Modified at',
                  render: (entry: CatalogEntry) => (
                    <Box sx={{ whiteSpace: 'nowrap' }}>{entry.modifiedAt}</Box>
                  ),
                },
              ]}
              rows={result.entries}
              getRowKey={(entry) => entry.serviceCatalogKey}
              onRowClick={(entry) =>
                updateParam('selected', entry.serviceCatalogKey)
              }
              footer={
                <TablePagination
                  component="div"
                  count={result.totalCount}
                  page={Math.floor(offset / limit)}
                  rowsPerPage={limit}
                  rowsPerPageOptions={[limit]}
                  onPageChange={(_, newPage) =>
                    updateParam(
                      'offset',
                      newPage === 0 ? null : String(newPage * limit),
                    )
                  }
                />
              }
            />
          )}
        </QueryStateGate>
      </Stack>
      {selectedKey && (
        <CatalogEntryDialog
          serviceCatalogKey={selectedKey}
          onClose={() => updateParam('selected', null)}
        />
      )}
    </>
  );
}
