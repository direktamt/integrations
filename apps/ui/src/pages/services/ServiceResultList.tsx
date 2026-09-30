import type {
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Stack, TablePagination } from '@mui/material';
import { useNavigate } from 'react-router';
import { DataTable } from '../../components/DataTable';
import { KeyChip } from '../../components/KeyChip';
import { deriveServiceTitle } from './ServiceTitle';

interface ServiceResultListProps {
  result: ServiceSearchResult;
  regionalKey: string;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
}

/**
 * Search results with server-side pagination; row click opens the
 * deep-linkable detail page.
 */
export function ServiceResultList({
  result,
  regionalKey,
  page,
  size,
  onPageChange,
}: ServiceResultListProps) {
  const navigate = useNavigate();

  return (
    <DataTable
      columns={[
        {
          header: 'Title',
          render: (service: PublicServiceDescription) =>
            deriveServiceTitle(service),
        },
        {
          header: 'Service catalog keys',
          render: (service: PublicServiceDescription) => (
            <Stack gap={1}>
              {service.serviceCatalogKeys.map((key) => (
                <KeyChip key={key} value={key} />
              ))}
            </Stack>
          ),
        },
        {
          header: 'Sections',
          width: 100,
          render: (service: PublicServiceDescription) =>
            service.sections.length,
        },
      ]}
      rows={result.services}
      getRowKey={(service, index) => service.id ?? String(index)}
      onRowClick={(service) => {
        if (service.id) {
          void navigate(
            `/services/${encodeURIComponent(service.id)}?regionalKey=${regionalKey}`,
          );
        }
      }}
      footer={
        <TablePagination
          component="div"
          count={result.totalElements ?? result.services.length}
          page={page}
          rowsPerPage={size}
          rowsPerPageOptions={[size]}
          onPageChange={(_, newPage) => onPageChange(newPage)}
        />
      }
    />
  );
}
