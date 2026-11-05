import SearchIcon from '@mui/icons-material/Search';
import type { Location } from '@direktamt/integrations-contracts';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { DataTable } from '../../components/DataTable';
import { KeyChip } from '../../components/KeyChip';

interface LocationResultTableProps {
  locations: Location[];
}

/**
 * Shared result table of the resolve and reverse-lookup panels:
 * copyable regional key + "Search services here" action.
 */
export function LocationResultTable({ locations }: LocationResultTableProps) {
  const navigate = useNavigate();

  return (
    <DataTable
      columns={[
        {
          header: 'Regional key',
          render: (location: Location) => (
            <KeyChip value={location.regionalKey} />
          ),
        },
        {
          header: 'Federal state key',
          render: (location: Location) => (
            <KeyChip value={location.federalStateKey} />
          ),
        },
        {
          header: 'Name',
          render: (location: Location) => (
            <Box sx={{ fontWeight: 500 }}>{location.name}</Box>
          ),
        },
        {
          header: 'Actions',
          width: 220,
          render: (location: Location) => (
            <Button
              size="small"
              startIcon={<SearchIcon />}
              onClick={() =>
                void navigate(`/services?regionalKey=${location.regionalKey}`)
              }
            >
              Search services here
            </Button>
          ),
        },
      ]}
      rows={locations}
      getRowKey={(location) => location.regionalKey}
    />
  );
}
