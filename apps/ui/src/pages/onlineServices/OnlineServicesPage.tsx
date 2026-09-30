import { Button, Stack, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useOnlineServices } from '../../api/queries/useOnlineServiceQueries';
import { KeyListField } from '../../components/KeyListField';
import { OnlineServiceTable } from '../../components/OnlineServiceTable';
import { PageHeader } from '../../components/PageHeader';
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
        title="Online services"
        description="Direct online-application links for a territory."
      />
      <form onSubmit={submit}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
          <Button
            type="submit"
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
          >
            Load
          </Button>
        </Stack>
      </form>
      <ValidationErrorAlert error={onlineServicesQuery.error} />
      <QueryStateGate
        query={onlineServicesQuery}
        idleMessage="Provide a regional key to load online services."
        isEmpty={(services) => services.length === 0}
      >
        {(services) => (
          <OnlineServiceTable
            services={services}
            onRowClick={(service) => {
              if (service.id) selectOnlineService(service.id);
            }}
          />
        )}
      </QueryStateGate>
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
