import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useOnlineServiceAuthorities } from '../../api/queries/useOnlineServiceQueries';
import { AuthorityCardList } from '../../components/AuthorityCardList';
import { JsonViewer } from '../../components/JsonViewer';
import { QueryStateGate } from '../../components/QueryStateGate';

interface OnlineServiceAuthoritiesDialogProps {
  onlineServiceId: string;
  title?: string;
  onClose: () => void;
}

/**
 * GET /online-services/{id}/authorities — responsible organisations of one
 * online service with their roles, in a dialog with its own query gate.
 */
export function OnlineServiceAuthoritiesDialog({
  onlineServiceId,
  title,
  onClose,
}: OnlineServiceAuthoritiesDialogProps) {
  const authoritiesQuery = useOnlineServiceAuthorities(onlineServiceId);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Responsible organisations — {title || onlineServiceId}
      </DialogTitle>
      <DialogContent>
        <QueryStateGate
          query={authoritiesQuery}
          isEmpty={(authorities) => authorities.length === 0}
          emptyMessage="No responsible organisation is published for this online service."
        >
          {(authorities) => (
            <Stack spacing={2}>
              <AuthorityCardList items={authorities} />
              <JsonViewer data={authorities} title="Raw response" />
            </Stack>
          )}
        </QueryStateGate>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
