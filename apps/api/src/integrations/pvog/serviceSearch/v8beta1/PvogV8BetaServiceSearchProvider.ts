import type {
  PublicServiceDescription,
  ServiceSearchResult,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../../../config';
import { BaseHttpClient } from '../../../common/BaseHttpClient';
import { mapConcurrently } from '../../../common/Concurrency';
import { UpstreamContractViolationException } from '../../../common/exceptions/UpstreamContractViolationException';
import { UpstreamHttpException } from '../../../common/exceptions/UpstreamHttpException';
import { ServiceDescriptionDetail } from '../../model/ServiceDescriptionDetail';
import { ServiceSearchOptions } from '../../model/ServiceSearchOptions';
import { PvogSearchClient } from '../../PvogSearchClient';
import { ServiceSearchProvider } from '../ServiceSearchProvider';
import { WireV8ServiceSearchHit } from './wire/WireV8ServiceSearchHit';
import { WireV8ServiceSearchResponse } from './wire/WireV8ServiceSearchResponse';

/**
 * Experimental adapter: `GET /v8beta1/servicedescriptions`, the announced
 * successor of the v7 search. Its hits are a reduced view (id, name,
 * teaser, federal states, languages, online-service links), so the adapter
 * loads every hit's full description from the detail endpoint to keep the
 * public contract identical to v7 — one search call plus one detail call
 * per hit, at most DETAIL_CONCURRENCY in flight. Differences absorbed: the
 * page totals live in a separate `page` object; the search is always fuzzy
 * and always evaluated at request time, so `fuzzySearch` and `validDate`
 * have no effect; `summary` and `targetAudiences` are not delivered by
 * either v8beta1 or the detail endpoint and stay empty. Never selected by
 * default. Handbook: apps/api/docs/INTEGRATIONS.md, section 1.3.
 */
@Injectable()
export class PvogV8BetaServiceSearchProvider
  extends BaseHttpClient
  implements ServiceSearchProvider
{
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;

  private static readonly SEARCH_PATH = '/v8beta1/servicedescriptions';

  private static readonly DETAIL_CONCURRENCY = 8;

  constructor(private readonly pvogSearchClient: PvogSearchClient) {
    super();
  }

  async searchServices(
    regionalKey: string,
    query: string,
    options: ServiceSearchOptions,
  ): Promise<ServiceSearchResult> {
    const wire = await this.getModel(
      WireV8ServiceSearchResponse,
      PvogV8BetaServiceSearchProvider.SEARCH_PATH,
      {
        ars: regionalKey,
        q: [query],
        size: options.size,
        page: options.page,
        useArsHierarchy: options.useRegionalHierarchy,
        personalMatters: options.lifeSituationCodes,
      },
    );

    const hits = wire.serviceDescriptions?.content ?? [];
    const services = await mapConcurrently(
      hits,
      PvogV8BetaServiceSearchProvider.DETAIL_CONCURRENCY,
      (hit) => this.toServiceDescription(hit, regionalKey, options),
    );

    return {
      services,
      totalElements: wire.serviceDescriptions?.page?.totalElements,
      totalPages: wire.serviceDescriptions?.page?.totalPages,
    };
  }

  /**
   * The detail endpoint supplies everything the reduced hit lacks; the hit
   * keeps the federal-state keys, which the detail does not deliver.
   */
  private async toServiceDescription(
    hit: WireV8ServiceSearchHit,
    regionalKey: string,
    options: ServiceSearchOptions,
  ): Promise<PublicServiceDescription> {
    let detail: ServiceDescriptionDetail;

    try {
      detail = await this.pvogSearchClient.getServiceDescription(
        hit.id,
        regionalKey,
        options.useRegionalHierarchy,
      );
    } catch (error) {
      if (error instanceof UpstreamHttpException && error.status === 404) {
        throw new UpstreamContractViolationException(
          this.baseUrl + PvogV8BetaServiceSearchProvider.SEARCH_PATH,
          [`search hit ${hit.id} has no service detail`],
        );
      }

      throw error;
    }

    return {
      ...detail.service,
      federalStateKeys: hit.federalStateKeys ?? [],
      availableLanguages:
        hit.availableLanguages ?? detail.service.availableLanguages,
    };
  }
}
