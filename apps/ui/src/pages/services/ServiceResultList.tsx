import type {
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Box, Stack, TablePagination, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { DataTable } from '../../components/DataTable';
import { KeyChip } from '../../components/KeyChip';
import { serializeDefaultTrueBoolean } from './DefaultTrueBoolean';
import { ServiceMetadataList } from './ServiceMetadataList';
import { deriveServiceSummary } from './ServiceSummary';
import { deriveServiceTitle } from './ServiceTitle';

interface ServiceResultListProps {
  result: ServiceSearchResult;
  regionalKey: string;
  useRegionalHierarchy: boolean;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
}

/**
 * Search results with server-side pagination; row click opens the
 * deep-linkable detail page and carries the territory context along
 * (regional key, and `useRegionalHierarchy=false` when the search disabled it).
 */
export function ServiceResultList({
  result,
  regionalKey,
  useRegionalHierarchy,
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
          render: (service: PublicServiceDescription) => (
            <Box sx={{ minWidth: 220 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {deriveServiceTitle(service)}
              </Typography>
              {deriveServiceSummary(service) && (
                <Typography
                  variant="caption"
                  component="div"
                  sx={{
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginTop: 0.25,
                  }}
                >
                  {deriveServiceSummary(service)}
                </Typography>
              )}
            </Box>
          ),
        },
        {
          header: 'Service catalog keys',
          render: (service: PublicServiceDescription) => (
            <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
              {service.serviceCatalogKeys.map((key) => (
                <KeyChip key={key} value={key} />
              ))}
            </Stack>
          ),
        },
        {
          header: 'Sections',
          width: 90,
          render: (service: PublicServiceDescription) =>
            service.sections.length,
        },
        {
          header: 'Metadata',
          width: 260,
          render: (service: PublicServiceDescription) => (
            <ServiceMetadataList service={service} dense />
          ),
        },
      ]}
      caption={`${result.totalElements ?? result.services.length} services`}
      rows={result.services}
      getRowKey={(service, index) => service.id ?? String(index)}
      onRowClick={(service) => {
        if (service.id) {
          const search = new URLSearchParams({ regionalKey });
          const hierarchy = serializeDefaultTrueBoolean(useRegionalHierarchy);
          if (hierarchy) search.set('useRegionalHierarchy', hierarchy);
          void navigate(
            `/services/${encodeURIComponent(service.id)}?${search.toString()}`,
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
