import type { OnlineService } from '@direktamt/integrations-contracts';
import { Box, Link, Stack } from '@mui/material';
import { ReactNode } from 'react';
import { DataTable } from './DataTable';
import { KeyChip } from './KeyChip';

interface OnlineServiceTableProps {
  services: OnlineService[];
  /**
   * Row click, e.g. to open the responsible organisations of a service.
   */
  onRowClick?: (service: OnlineService) => void;
  /**
   * Summary line above the table.
   */
  caption?: ReactNode;
}

/**
 * Online-application links as a table: name, description, catalog keys,
 * external links (new tab) and the upstream change timestamp.
 */
export function OnlineServiceTable({
  services,
  onRowClick,
  caption,
}: OnlineServiceTableProps) {
  return (
    <DataTable
      columns={[
        {
          header: 'Name',
          render: (service: OnlineService) => (
            <Box
              sx={{
                fontWeight: 500,
                minWidth: 160,
                maxWidth: 320,
                overflowWrap: 'anywhere',
              }}
            >
              {service.name ?? '(unnamed)'}
            </Box>
          ),
        },
        {
          header: 'Description',
          render: (service: OnlineService) => (
            <Box
              title={service.description ?? undefined}
              sx={{
                minWidth: 200,
                maxWidth: 420,
                overflowWrap: 'anywhere',
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {service.description}
            </Box>
          ),
        },
        {
          header: 'Service catalog keys',
          render: (service: OnlineService) => (
            <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
              {service.serviceCatalogKeys.map((key) => (
                <KeyChip key={key} value={key} />
              ))}
            </Stack>
          ),
        },
        {
          header: 'Links',
          render: (service: OnlineService) =>
            service.links.map((link, index) =>
              link.url ? (
                <Box
                  key={index}
                  sx={{
                    overflowWrap: 'anywhere',
                    minWidth: 140,
                    maxWidth: 240,
                  }}
                >
                  <Link
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {link.title || link.url}
                  </Link>
                </Box>
              ) : null,
            ),
        },
        {
          header: 'Last updated',
          render: (service: OnlineService) => (
            <Box sx={{ whiteSpace: 'nowrap' }}>{service.lastUpdatedAt}</Box>
          ),
        },
      ]}
      rows={services}
      getRowKey={(service, index) => service.id ?? String(index)}
      onRowClick={onRowClick}
      caption={caption}
    />
  );
}
