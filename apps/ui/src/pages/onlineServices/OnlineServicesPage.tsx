import type { OnlineService } from '@direktamt/integrations-contracts';
import { Button, Link, Stack, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useOnlineServices } from '../../api/queries/useOnlineServiceQueries';
import { DataTable } from '../../components/DataTable';
import { KeyChip } from '../../components/KeyChip';
import { KeyListField } from '../../components/KeyListField';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';

/**
 * GET /online-services — direct online-application links for a
 * territory, optionally filtered per service.
 */
export function OnlineServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const regionalKey = searchParams.get('regionalKey') ?? '';
  const serviceCatalogKeysParam = searchParams.get('serviceCatalogKeys') ?? '';
  const serviceCatalogKeys = serviceCatalogKeysParam.split(',').filter(Boolean);
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
          <DataTable
            columns={[
              {
                header: 'Name',
                render: (service: OnlineService) => service.name ?? '(unnamed)',
              },
              {
                header: 'Description',
                render: (service: OnlineService) => service.description,
              },
              {
                header: 'Service catalog keys',
                render: (service: OnlineService) =>
                  service.serviceCatalogKeys.map((key) => (
                    <KeyChip key={key} value={key} />
                  )),
              },
              {
                header: 'Links',
                render: (service: OnlineService) =>
                  service.links.map((link, index) =>
                    link.url ? (
                      <div key={index}>
                        <Link href={link.url} target="_blank" rel="noreferrer">
                          {link.title || link.url}
                        </Link>
                      </div>
                    ) : null,
                  ),
              },
              {
                header: 'Last updated',
                render: (service: OnlineService) => service.lastUpdatedAt,
              },
            ]}
            rows={services}
            getRowKey={(service, index) => service.id ?? String(index)}
          />
        )}
      </QueryStateGate>
    </>
  );
}
