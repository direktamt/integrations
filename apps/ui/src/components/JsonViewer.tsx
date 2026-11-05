import { CodeBlock } from '@direktamt/ui-kit';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';

interface JsonViewerProps {
  data: unknown;
  title?: string;
  defaultExpanded?: boolean;
}

/**
 * Collapsible pretty-printed JSON block.
 */
export function JsonViewer({
  data,
  title = 'Raw JSON',
  defaultExpanded = false,
}: JsonViewerProps) {
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <DataObjectOutlinedIcon
            fontSize="small"
            sx={{ color: 'text.secondary' }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <CodeBlock label={title}>{JSON.stringify(data, null, 2)}</CodeBlock>
      </AccordionDetails>
    </Accordion>
  );
}
