import type { ParsedMasterText } from '@direktamt/integrations-contracts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../ApiClient';

/**
 * GET /master-texts/{editorialOfficeId}/{serviceId} — parsed federal
 * master text; upstream pass-through JSON.
 */
export function useMasterText(
  editorialOfficeId: string,
  serviceId: string,
  source?: string,
) {
  return useQuery({
    queryKey: ['masterTexts', editorialOfficeId, serviceId, source],
    queryFn: () =>
      apiClient.get<ParsedMasterText>(
        `/master-texts/${encodeURIComponent(editorialOfficeId)}/${encodeURIComponent(serviceId)}`,
        { source: source || undefined },
      ),
    enabled: editorialOfficeId.length > 0 && serviceId.length > 0,
  });
}
