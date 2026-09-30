import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  Link as RouterLink,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import {
  useService,
  useServiceAuthorities,
} from '../../api/queries/useServiceQueries';
import { AuthorityCardList } from '../../components/AuthorityCardList';
import { JsonViewer } from '../../components/JsonViewer';
import { KeyChip } from '../../components/KeyChip';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { parseDefaultTrueBoolean } from './DefaultTrueBoolean';
import { ServiceMetadataList } from './ServiceMetadataList';
import { ServiceSectionList } from './ServiceSectionList';
import { deriveServiceTitle } from './ServiceTitle';

/**
 * GET /services/{id} and GET /services/{id}/authorities: deep-linkable
 * detail page of one service description for a territory, with the
 * authorities responsible for it. `useRegionalHierarchy` follows the same
 * URL semantics as the search page (absent means true).
 */
export function ServiceDetailPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const regionalKey = searchParams.get('regionalKey') ?? '';
  const useRegionalHierarchy = parseDefaultTrueBoolean(
    searchParams.get('useRegionalHierarchy'),
  );

  const serviceQuery = useService(id, regionalKey, useRegionalHierarchy);
  const authoritiesQuery = useServiceAuthorities(
    id,
    regionalKey,
    useRegionalHierarchy,
  );

  return (
    <>
      <PageHeader
        title="Service detail"
        description={`GET /services/${id}`}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<AccountTreeIcon />}
              component={RouterLink}
              to={`/services/${encodeURIComponent(id)}/context?${searchParams.toString()}`}
            >
              Inspect composed context
            </Button>
            <Button
              startIcon={<DataObjectIcon />}
              component={RouterLink}
              to={`/raw?id=${encodeURIComponent(id)}`}
            >
              Raw JZuFi 2.3
            </Button>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => void navigate(-1)}
            >
              Back
            </Button>
          </Stack>
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
            <ServiceMetadataList service={service} />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Sections
              </Typography>
              <ServiceSectionList sections={service.sections} />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Responsible authorities
              </Typography>
              <QueryStateGate
                query={authoritiesQuery}
                isEmpty={(authorities) => authorities.length === 0}
                emptyMessage="No responsible authority is published for this service in the territory."
              >
                {(authorities) => (
                  <Stack spacing={2}>
                    <AuthorityCardList
                      items={authorities.map(({ authority, role }) => ({
                        authority,
                        roles: [role],
                      }))}
                    />
                    <JsonViewer
                      data={authorities}
                      title="Raw authorities response"
                    />
                  </Stack>
                )}
              </QueryStateGate>
            </Box>
            <JsonViewer data={service} title="Raw response" />
          </Stack>
        )}
      </QueryStateGate>
    </>
  );
}
