import type { ServiceSearchResult } from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../../../config';
import { BaseHttpClient } from '../../../common/BaseHttpClient';
import { ServiceSearchOptions } from '../../model/ServiceSearchOptions';
import { toServiceDescription } from '../../ServiceDescriptionMapper';
import { ServiceSearchProvider } from '../ServiceSearchProvider';
import { WireV7ServiceSearchResponse } from './wire/WireV7ServiceSearchResponse';

/**
 * Production adapter (default): `GET /v7/servicedescriptions/{ars}`. The
 * hits are full service descriptions, so one upstream call answers a
 * search page. Handbook: apps/api/docs/INTEGRATIONS.md, section 1.3.
 */
@Injectable()
export class PvogV7ServiceSearchProvider
  extends BaseHttpClient
  implements ServiceSearchProvider
{
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;

  async searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult> {
    const wire = await this.getModel(
      WireV7ServiceSearchResponse,
      `/v7/servicedescriptions/${encodeURIComponent(regionalKey)}`,
      {
        q: [query],
        size: options.size,
        page: options.page,
        fuzzysearch: options.fuzzySearch,
        useArsHierarchy: options.useRegionalHierarchy,
        personalMatters: options.lifeSituationCodes,
        validDate: options.validDate,
      },
    );

    const content = wire.serviceDescriptions?.content ?? [];

    return {
      services: content.map((item) => toServiceDescription(item)),
      totalElements: wire.serviceDescriptions?.totalElements,
      totalPages: wire.serviceDescriptions?.totalPages,
    };
  }
}
