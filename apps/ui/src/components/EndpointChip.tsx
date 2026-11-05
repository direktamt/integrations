import { Box } from '@mui/material';

interface EndpointChipProps {
  /** Path template of the integrations API endpoint, e.g. `/services/{id}`. */
  path: string;
  method?: 'GET';
}

/**
 * Monospace label of an integrations API endpoint a view exercises.
 */
export function EndpointChip({ path, method = 'GET' }: EndpointChipProps) {
  return (
    <Box
      component="code"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        paddingInline: 1,
        paddingBlock: 0.25,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'border.subtle',
        bgcolor: 'background.paper',
        fontSize: '0.75rem',
        lineHeight: 1.6,
        color: 'text.primary',
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        sx={{ fontWeight: 700, color: 'success.main', letterSpacing: '0.02em' }}
      >
        {method}
      </Box>
      {path}
    </Box>
  );
}
