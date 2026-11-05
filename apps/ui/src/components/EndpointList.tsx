import { Stack } from '@mui/material';
import { EndpointChip } from './EndpointChip';

interface EndpointListProps {
  paths: string[];
}

/**
 * Row of endpoint chips for the metadata slot of a page header.
 */
export function EndpointList({ paths }: EndpointListProps) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {paths.map((path) => (
        <EndpointChip key={path} path={path} />
      ))}
    </Stack>
  );
}
