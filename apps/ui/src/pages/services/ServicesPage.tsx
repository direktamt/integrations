import { useSearchParams } from 'react-router';
import {
  SearchServicesParams,
  useSearchServices,
} from '../../api/queries/useServiceQueries';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';
import { ServiceResultList } from './ServiceResultList';
import { ServiceSearchForm } from './ServiceSearchForm';

const DEFAULT_SIZE = 20;

/**
 * GET /services — the core "I am in {city} and want to {task}" flow.
 * All search state lives in URL params.
 */
export function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: SearchServicesParams = {
    regionalKey: searchParams.get('regionalKey') ?? '',
    query: searchParams.get('query') ?? '',
    size: searchParams.has('size')
      ? Number(searchParams.get('size'))
      : undefined,
    page: searchParams.has('page')
      ? Number(searchParams.get('page'))
      : undefined,
    fuzzySearch: searchParams.get('fuzzySearch') === 'true' || undefined,
    useRegionalHierarchy:
      searchParams.get('useRegionalHierarchy') === 'true' || undefined,
    lifeSituationCodes:
      searchParams.get('lifeSituationCodes')?.split(',').filter(Boolean) ??
      undefined,
    validDate: searchParams.get('validDate') ?? undefined,
  };

  const searchQuery = useSearchServices(params);

  const applyParams = (values: SearchServicesParams) => {
    const next = new URLSearchParams();
    next.set('regionalKey', values.regionalKey);
    next.set('query', values.query);
    if (values.size !== undefined) next.set('size', String(values.size));
    if (values.page) next.set('page', String(values.page));
    if (values.fuzzySearch) next.set('fuzzySearch', 'true');
    if (values.useRegionalHierarchy) next.set('useRegionalHierarchy', 'true');
    if (values.lifeSituationCodes?.length)
      next.set('lifeSituationCodes', values.lifeSituationCodes.join(','));
    if (values.validDate) next.set('validDate', values.validDate);
    setSearchParams(next);
  };

  return (
    <>
      <PageHeader
        title="Services"
        description="Plain-language search for public services within a territory."
      />
      <ServiceSearchForm
        key={searchParams.toString()}
        initialValues={params}
        onSubmit={applyParams}
      />
      <ValidationErrorAlert error={searchQuery.error} />
      <QueryStateGate
        query={searchQuery}
        idleMessage="Provide a regional key and a query to search."
        isEmpty={(result) => result.services.length === 0}
      >
        {(result) => (
          <ServiceResultList
            result={result}
            regionalKey={params.regionalKey}
            page={params.page ?? 0}
            size={params.size ?? DEFAULT_SIZE}
            onPageChange={(page) => applyParams({ ...params, page })}
          />
        )}
      </QueryStateGate>
    </>
  );
}
