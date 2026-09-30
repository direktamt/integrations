import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useService } from '../../api/queries/useServiceQueries';
import { JsonViewer } from '../../components/JsonViewer';
import { KeyChip } from '../../components/KeyChip';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ServiceSectionList } from './ServiceSectionList';
import { deriveServiceTitle } from './ServiceTitle';

/**
 * GET /services/{id} — deep-linkable detail page of one service
 * description for a territory.
 */
export function ServiceDetailPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const regionalKey = searchParams.get('regionalKey') ?? '';
  const useRegionalHierarchy =
    searchParams.get('useRegionalHierarchy') === 'true' || undefined;

  const serviceQuery = useService(id, regionalKey, useRegionalHierarchy);

  return (
    <>
      <PageHeader
        title="Service detail"
        description={`GET /services/${id}`}
        actions={
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => void navigate(-1)}
          >
            Back
          </Button>
        }
      />
      <QueryStateGate
        query={serviceQuery}
        idleMessage="A regionalKey URL parameter is required to load this service."
      >
        {(service) => (
          <Stack spacing={2}>
            <Typography variant="h6">{deriveServiceTitle(service)}</Typography>
            {service.summary && (
              <Typography variant="body2" color="text.secondary">
                {service.summary}
              </Typography>
            )}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Service catalog keys (LeiKa)
              </Typography>
              {service.serviceCatalogKeys.length > 0 ? (
                service.serviceCatalogKeys.map((key) => (
                  <KeyChip key={key} value={key} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  None
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Regional keys (ARS)
              </Typography>
              {service.regionalKeys.length > 0 ? (
                service.regionalKeys.map((key) => (
                  <KeyChip key={key} value={key} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  None
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Sections
              </Typography>
              <ServiceSectionList sections={service.sections} />
            </Box>
            <JsonViewer data={service} title="Raw response" />
          </Stack>
        )}
      </QueryStateGate>
    </>
  );
}
