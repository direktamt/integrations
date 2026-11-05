import { PageHeader, SectionCard } from '@direktamt/ui-kit';
import { Button, Stack, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useOnlineServices } from '../../api/queries/useOnlineServiceQueries';
import { EndpointList } from '../../components/EndpointList';
import { FormRow } from '../../components/FormRow';
import { KeyListField } from '../../components/KeyListField';
import { OnlineServiceTable } from '../../components/OnlineServiceTable';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';
import { OnlineServiceAuthoritiesDialog } from './OnlineServiceAuthoritiesDialog';

/**
 * GET /online-services — direct online-application links for a
 * territory, optionally filtered per service. A row click opens the
 * responsible organisations of that online service (`selected` URL
 * parameter); the list itself never loads authorities.
 */
export function OnlineServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const regionalKey = searchParams.get('regionalKey') ?? '';
  const serviceCatalogKeysParam = searchParams.get('serviceCatalogKeys') ?? '';
  const serviceCatalogKeys = serviceCatalogKeysParam.split(',').filter(Boolean);
  const selectedId = searchParams.get('selected') ?? '';
  const [keyInput, setKeyInput] = useState(regionalKey);
  const [catalogKeysInput, setCatalogKeysInput] =
    useState<string[]>(serviceCatalogKeys);

  // Committed URL values are the source of truth: re-sync the drafts when the
  // URL changes through Back/Forward, a deep link or programmatic navigation.
  useEffect(() => {
    setKeyInput(regionalKey);
  }, [regionalKey]);
  useEffect(() => {
    setCatalogKeysInput(serviceCatalogKeysParam.split(',').filter(Boolean));
  }, [serviceCatalogKeysParam]);

  const onlineServicesQuery = useOnlineServices(
    regionalKey,
    serviceCatalogKeys.length ? serviceCatalogKeys : undefined,
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (keyInput) next.set('regionalKey', keyInput);
    if (catalogKeysInput.length)
      next.set('serviceCatalogKeys', catalogKeysInput.join(','));
    setSearchParams(next);
  };

  const selectOnlineService = (id: string | null) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (id === null) {
        next.delete('selected');
      } else {
        next.set('selected', id);
      }
      return next;
    });
  };

  const selectedService = onlineServicesQuery.data?.find(
    (service) => service.id === selectedId,
  );

  return (
    <>
      <PageHeader
        overline="Services (PVOG)"
        title="Online services"
        description="Direct online-application links for a territory; select a row for the responsible organisations."
      >
        <EndpointList
          paths={['/online-services', '/online-services/{id}/authorities']}
        />
      </PageHeader>
      <Stack spacing={3}>
        <SectionCard title="Territory">
          <form onSubmit={submit}>
            <FormRow>
              <TextField
                label="Regional key"
                size="small"
                required
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
              />
              <KeyListField
                label="Service catalog keys"
                value={catalogKeysInput}
                onChange={setCatalogKeysInput}
                helperText="Optional; press Enter to add"
              />
              <Button type="submit" variant="contained">
                Load
              </Button>
            </FormRow>
          </form>
          <ValidationErrorAlert error={onlineServicesQuery.error} />
        </SectionCard>
        <QueryStateGate
          query={onlineServicesQuery}
          idleMessage="Provide a regional key to load online services."
          isEmpty={(services) => services.length === 0}
        >
          {(services) => (
            <OnlineServiceTable
              caption={`${services.length} online services`}
              services={services}
              onRowClick={(service) => {
                if (service.id) selectOnlineService(service.id);
              }}
            />
          )}
        </QueryStateGate>
      </Stack>
      {selectedId && (
        <OnlineServiceAuthoritiesDialog
          onlineServiceId={selectedId}
          title={selectedService?.name}
          onClose={() => selectOnlineService(null)}
        />
      )}
    </>
  );
}
