import { useSearchParams } from 'react-router';
import {
  SearchServicesParams,
  useSearchServices,
} from '../../api/queries/useServiceQueries';
import { PageHeader } from '../../components/PageHeader';
import { QueryStateGate } from '../../components/QueryStateGate';
import { ValidationErrorAlert } from '../../components/ValidationErrorAlert';
import {
  parseDefaultTrueBoolean,
  serializeDefaultTrueBoolean,
} from './DefaultTrueBoolean';
import { ServiceResultList } from './ServiceResultList';
import { ServiceSearchForm } from './ServiceSearchForm';

const DEFAULT_SIZE = 20;

/**
 * GET /services: plain-language service search within a territory. All
 * search state lives in URL params; the boolean options follow the API
 * defaults (absent means true, only an explicit `false` is stored).
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
    fuzzySearch: parseDefaultTrueBoolean(searchParams.get('fuzzySearch')),
    useRegionalHierarchy: parseDefaultTrueBoolean(
      searchParams.get('useRegionalHierarchy'),
    ),
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
    const fuzzySearch = serializeDefaultTrueBoolean(values.fuzzySearch);
    if (fuzzySearch) next.set('fuzzySearch', fuzzySearch);
    const useRegionalHierarchy = serializeDefaultTrueBoolean(
      values.useRegionalHierarchy,
    );
    if (useRegionalHierarchy) {
      next.set('useRegionalHierarchy', useRegionalHierarchy);
    }
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
            useRegionalHierarchy={params.useRegionalHierarchy ?? true}
            page={params.page ?? 0}
            size={params.size ?? DEFAULT_SIZE}
            onPageChange={(page) => applyParams({ ...params, page })}
          />
        )}
      </QueryStateGate>
    </>
  );
}
