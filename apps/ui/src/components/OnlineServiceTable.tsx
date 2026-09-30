import type { OnlineService } from '@direktamt/integrations-contracts';
import { Link } from '@mui/material';
import { DataTable } from './DataTable';
import { KeyChip } from './KeyChip';

interface OnlineServiceTableProps {
  services: OnlineService[];
}

/**
 * Online-application links as a table: name, description, catalog keys,
 * external links (new tab) and the upstream change timestamp.
 */
export function OnlineServiceTable({ services }: OnlineServiceTableProps) {
  return (
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
  );
}
