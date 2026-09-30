import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  ServiceContextPart,
  type CatalogEntry,
  type ServiceContext,
} from '@direktamt/integrations-contracts';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { ReactNode } from 'react';
import {
  Link as RouterLink,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { useServiceContext } from '../../api/queries/useServiceQueries';
import { DataTable } from '../../components/DataTable';
import { JsonViewer } from '../../components/JsonViewer';
import { KeyChip } from '../../components/KeyChip';
import { OnlineServiceTable } from '../../components/OnlineServiceTable';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { parseDefaultTrueBoolean } from './DefaultTrueBoolean';
import { ServiceAuthorityList } from './ServiceAuthorityList';
import { ServiceMetadataList } from './ServiceMetadataList';
import { deriveServiceTitle } from './ServiceTitle';

/**
 * GET /services/{id}/context: everything the integration layer composes for
 * one service in a territory (PVOG service, authorities and online services;
 * FIM catalog entries and master texts) with the partial-failure status.
 * Same URL semantics as the detail page (absent `useRegionalHierarchy`
 * means true).
 */
export function ServiceContextPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const regionalKey = searchParams.get('regionalKey') ?? '';
  const useRegionalHierarchy = parseDefaultTrueBoolean(
    searchParams.get('useRegionalHierarchy'),
  );

  const contextQuery = useServiceContext(id, regionalKey, useRegionalHierarchy);

  return (
    <>
      <PageHeader
        title="Service context"
        description={`GET /services/${id}/context`}
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
        query={contextQuery}
        idleMessage="A regionalKey URL parameter is required to load this context."
      >
        {(context) => (
          <Stack spacing={3}>
            <ContextStatus context={context} />
            <ContextSection title="Service">
              <Stack spacing={1} alignItems="flex-start">
                <Typography variant="h6">
                  {deriveServiceTitle(context.service)}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {context.service.serviceCatalogKeys.map((key) => (
                    <KeyChip key={key} value={key} />
                  ))}
                </Stack>
                <ServiceMetadataList service={context.service} />
                <Link
                  component={RouterLink}
                  to={`/services/${encodeURIComponent(id)}?${searchParams.toString()}`}
                >
                  Open service detail
                </Link>
              </Stack>
            </ContextSection>
            <ContextSection
              title="Responsible authorities"
              part={ServiceContextPart.Authorities}
              context={context}
              isEmpty={context.authorities.length === 0}
            >
              <ServiceAuthorityList authorities={context.authorities} />
            </ContextSection>
            <ContextSection
              title="Online services"
              part={ServiceContextPart.OnlineServices}
              context={context}
              isEmpty={context.onlineServices.length === 0}
            >
              <OnlineServiceTable services={context.onlineServices} />
            </ContextSection>
            <ContextSection
              title="Catalog entries"
              part={ServiceContextPart.CatalogEntries}
              context={context}
              isEmpty={context.catalogEntries.length === 0}
            >
              <DataTable
                columns={[
                  {
                    header: 'Service catalog key',
                    render: (entry: CatalogEntry) => (
                      <KeyChip value={entry.serviceCatalogKey} />
                    ),
                  },
                  {
                    header: 'Title',
                    render: (entry: CatalogEntry) => entry.title,
                  },
                  {
                    header: 'Editorial office id',
                    render: (entry: CatalogEntry) => (
                      <KeyChip value={entry.editorialOfficeId} />
                    ),
                  },
                  {
                    header: 'Service id',
                    render: (entry: CatalogEntry) => (
                      <KeyChip value={entry.serviceId} />
                    ),
                  },
                  {
                    header: 'Service type',
                    render: (entry: CatalogEntry) => entry.serviceType,
                  },
                ]}
                rows={context.catalogEntries}
                getRowKey={(entry) => entry.serviceCatalogKey}
              />
            </ContextSection>
            <ContextSection
              title="Master texts"
              part={ServiceContextPart.MasterTexts}
              context={context}
              isEmpty={context.masterTexts.length === 0}
            >
              <Stack spacing={1}>
                {context.masterTexts.map((text, index) => (
                  <JsonViewer
                    key={index}
                    data={text}
                    title={`Master text ${index + 1}`}
                  />
                ))}
              </Stack>
            </ContextSection>
            <JsonViewer data={context} title="Raw response" />
          </Stack>
        )}
      </QueryStateGate>
    </>
  );
}

interface ContextStatusProps {
  context: ServiceContext;
}

/**
 * Machine-readable status as an alert: complete, or the parts whose
 * upstream failed (they are returned empty).
 */
function ContextStatus({ context }: ContextStatusProps) {
  const { complete, unavailableParts } = context.status;

  return complete ? (
    <Alert severity="success">All parts loaded.</Alert>
  ) : (
    <Alert severity="warning">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <span>Unavailable parts (returned empty):</span>
        {unavailableParts.map((part) => (
          <Chip key={part} label={part} size="small" color="warning" />
        ))}
      </Stack>
    </Alert>
  );
}

interface ContextSectionProps {
  title: string;
  children: ReactNode;
  /**
   * Auxiliary part shown by this section; omitted for the service itself.
   */
  part?: ServiceContextPart;
  context?: ServiceContext;
  isEmpty?: boolean;
}

/**
 * One titled region of the context. An unavailable part shows a warning
 * instead of its (empty) content; a genuinely empty part says so.
 */
function ContextSection({
  title,
  children,
  part,
  context,
  isEmpty = false,
}: ContextSectionProps) {
  const unavailable =
    part !== undefined &&
    context !== undefined &&
    context.status.unavailableParts.includes(part);

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {unavailable ? (
        <Alert severity="warning">
          Not loaded: the upstream source of this part is unavailable.
        </Alert>
      ) : isEmpty ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        children
      )}
    </Box>
  );
}
