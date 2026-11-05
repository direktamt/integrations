import { PageHeader, SectionCard } from '@direktamt/ui-kit';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined';
import type { PublicServiceDescription } from '@direktamt/integrations-contracts';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  useService,
  useServiceAuthorities,
} from '../../api/queries/useServiceQueries';
import { AuthorityCardList } from '../../components/AuthorityCardList';
import { EndpointList } from '../../components/EndpointList';
import { JsonViewer } from '../../components/JsonViewer';
import { KeyChip } from '../../components/KeyChip';
import { QueryStateGate } from '../../components/QueryStateGate';
import { parseDefaultTrueBoolean } from './DefaultTrueBoolean';
import { ServiceMetadataList } from './ServiceMetadataList';
import { ServiceSectionList } from './ServiceSectionList';
import { deriveServiceSummary } from './ServiceSummary';
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
        overline="Service description (PVOG)"
        title={
          serviceQuery.data
            ? deriveServiceTitle(serviceQuery.data)
            : 'Service detail'
        }
        description={
          serviceQuery.data
            ? deriveServiceSummary(serviceQuery.data)
            : undefined
        }
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => void navigate(-1)}
            >
              Back
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DataObjectOutlinedIcon />}
              href={`/raw?id=${encodeURIComponent(id)}`}
            >
              Raw JZuFi 2.3
            </Button>
            <Button
              variant="contained"
              startIcon={<AccountTreeOutlinedIcon />}
              href={`/services/${encodeURIComponent(id)}/context?${searchParams.toString()}`}
            >
              Inspect composed context
            </Button>
          </>
        }
      >
        <EndpointList
          paths={[`/services/${id}`, `/services/${id}/authorities`]}
        />
      </PageHeader>
      <QueryStateGate
        query={serviceQuery}
        idleMessage="A regionalKey URL parameter is required to load this service."
      >
        {(service) => (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                lg: 'minmax(0, 1fr) 320px',
              },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Stack spacing={3} sx={{ minWidth: 0 }}>
              <SectionCard
                title="Sections"
                description="Content sections as published, with the original German titles."
              >
                <ServiceSectionList sections={service.sections} />
              </SectionCard>
              <SectionCard
                title="Responsible authorities"
                description="Organisation units responsible for this service in the territory."
              >
                <QueryStateGate
                  query={authoritiesQuery}
                  isEmpty={(authorities) => authorities.length === 0}
                  emptyMessage="No responsible authority is published for this service in the territory."
                  dense
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
              </SectionCard>
              <JsonViewer data={service} title="Raw response" />
            </Stack>
            <Box sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
              <ServiceFacts service={service} regionalKey={regionalKey} />
            </Box>
          </Box>
        )}
      </QueryStateGate>
    </>
  );
}

interface ServiceFactsProps {
  service: PublicServiceDescription;
  regionalKey: string;
}

/**
 * Side column: official keys and publication metadata of the service.
 */
function ServiceFacts({ service, regionalKey }: ServiceFactsProps) {
  return (
    <SectionCard title="Identifiers">
      <Stack spacing={2.5}>
        <FactGroup title="PVOG id">
          {service.id ? <KeyChip value={service.id} /> : null}
        </FactGroup>
        <FactGroup title="Requested territory (ARS)">
          {regionalKey ? <KeyChip value={regionalKey} /> : null}
        </FactGroup>
        <FactGroup title="Service catalog keys (LeiKa)">
          {service.serviceCatalogKeys.map((key) => (
            <KeyChip key={key} value={key} />
          ))}
        </FactGroup>
        <FactGroup title="Regional keys (ARS)">
          {service.regionalKeys.map((key) => (
            <KeyChip key={key} value={key} />
          ))}
        </FactGroup>
        <ServiceMetadataList service={service} dense />
      </Stack>
    </SectionCard>
  );
}

interface FactGroupProps {
  title: string;
  children: ReactNode;
}

function FactGroup({ title, children }: FactGroupProps) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;

  return (
    <Box>
      <Typography
        variant="caption"
        component="div"
        sx={{ color: 'text.secondary', fontWeight: 600, marginBottom: 0.75 }}
      >
        {title}
      </Typography>
      {isEmpty ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          None
        </Typography>
      ) : (
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          {children}
        </Stack>
      )}
    </Box>
  );
}
