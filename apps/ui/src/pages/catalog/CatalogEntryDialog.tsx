import { DescriptionList } from '@direktamt/ui-kit';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import type { CatalogEntry } from '@direktamt/integrations-contracts';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useCatalogEntry } from '../../api/queries/useCatalogQueries';
import { JsonViewer } from '../../components/JsonViewer';
import { KeyChip } from '../../components/KeyChip';
import { QueryStateGate } from '../../components/QueryStateGate';

interface CatalogEntryDialogProps {
  serviceCatalogKey: string;
  onClose: () => void;
}

/**
 * GET /catalog/{serviceCatalogKey} — full entry in a dialog, with a
 * pre-filled link to the master texts page.
 */
export function CatalogEntryDialog({
  serviceCatalogKey,
  onClose,
}: CatalogEntryDialogProps) {
  const navigate = useNavigate();
  const entryQuery = useCatalogEntry(serviceCatalogKey);

  const openMasterTexts = (entry: CatalogEntry) => {
    void navigate(
      `/master-texts?editorialOfficeId=${encodeURIComponent(entry.editorialOfficeId)}&serviceId=${encodeURIComponent(entry.serviceId)}`,
    );
  };

  const fields = (entry: CatalogEntry): [string, ReactNode][] => [
    ['Service catalog key', <KeyChip value={entry.serviceCatalogKey} />],
    ['Editorial office id', <KeyChip value={entry.editorialOfficeId} />],
    ['Service id', <KeyChip value={entry.serviceId} />],
    ['Title', entry.title],
    ['Official name', entry.officialName],
    ['Citizen-facing name', entry.citizenFacingName],
    ['Approval status', entry.approvalStatus],
    ['Created at', entry.createdAt],
    ['Modified at', entry.modifiedAt],
    ['Type codes', entry.typeCodes.join(', ')],
    ['Service type', entry.serviceType],
    ['Legal basis', entry.legalBasis],
  ];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Catalog entry {serviceCatalogKey}</DialogTitle>
      <DialogContent>
        <QueryStateGate query={entryQuery} dense>
          {(entry) => (
            <Stack spacing={2}>
              <DescriptionList
                items={fields(entry).map(([label, value]) => ({
                  label,
                  value,
                }))}
              />
              <JsonViewer data={entry} title="Raw response" />
            </Stack>
          )}
        </QueryStateGate>
      </DialogContent>
      <DialogActions>
        {entryQuery.data && (
          <Button
            startIcon={<ArticleOutlinedIcon />}
            onClick={() => openMasterTexts(entryQuery.data)}
            sx={{ marginInlineEnd: 'auto' }}
          >
            Open master texts
          </Button>
        )}
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
