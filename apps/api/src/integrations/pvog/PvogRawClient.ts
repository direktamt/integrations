import type {
  JsonValue,
  RawSourceResponse,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../config';
import { BaseHttpClient } from '../common/BaseHttpClient';

/**
 * Adapter for the raw JZuFi resources of the public PVOG Suchdienst API:
 * the provider's own JSON representation (XZuFi 2.3 as JSON) of a service
 * description or an online service, passed through unchanged. The upstream
 * paths are fixed here; callers only supply an object id, which is
 * URL-encoded into its path segment. No wire model on purpose: the shape is
 * the provider's contract and receives no normalization or guarantee.
 * Docs: GET {baseUrl}/v3/api-docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, section 1.8.
 */
@Injectable()
export class PvogRawClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;

  /**
   * JZuFi 2.3 representation of one service description (Leistung).
   */
  getServiceDescriptionJzufi(id: string): Promise<RawSourceResponse> {
    return this.getJzufi(
      `/v1/servicedescriptions/${encodeURIComponent(id)}/jzufi-2-3`,
    );
  }

  /**
   * JZuFi 2.3 representation of one online service (Onlinedienst).
   */
  getOnlineServiceJzufi(id: string): Promise<RawSourceResponse> {
    return this.getJzufi(
      `/v1/onlineservices/${encodeURIComponent(id)}/jzufi-2-3`,
    );
  }

  /**
   * The base client already enforces a 2xx status and a parseable JSON
   * body (anything else is an upstream exception); the parsed value is
   * wrapped without being touched.
   */
  private async getJzufi(path: string): Promise<RawSourceResponse> {
    const data = await this.getRawJson<JsonValue>(path);

    return { provider: 'PVOG', representation: 'jzufi-2-3', data };
  }
}
