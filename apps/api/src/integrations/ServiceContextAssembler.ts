import {
  ServiceContextPart,
  type CatalogEntry,
  type ParsedMasterText,
  type ServiceAuthority,
  type ServiceContext,
} from '@direktamt/integrations-contracts';
import { Injectable, Logger } from '@nestjs/common';
import { IntegrationException } from './common/exceptions/IntegrationException';
import { UpstreamHttpException } from './common/exceptions/UpstreamHttpException';
import { FimPortalClient } from './fim/FimPortalClient';
import { PvogAuthorityClient } from './pvog/PvogAuthorityClient';
import { AuthorityDetailScope } from './pvog/model/AuthorityDetailScope';
import { ServiceAuthorityReference } from './pvog/model/ServiceAuthorityReference';
import { PvogSearchClient } from './pvog/PvogSearchClient';

/**
 * Outcome of loading one auxiliary part of the context.
 */
interface PartResult<T> {
  value: T[];

  /**
   * False when the upstream source failed; the value is then empty.
   */
  available: boolean;
}

/**
 * Composes the context of one service from PVOG and FIM along the published
 * identifier relations:
 *
 *   service detail ── authority references ──→ authorities
 *        │
 *        └── LeiKa keys ──→ online services (PVOG)
 *                      └──→ catalog entries (FIM) ──→ master texts (FIM)
 *
 * The service detail is loaded once and is mandatory. The three branches
 * below it run in parallel; within a branch, requests for several keys run
 * in parallel as well. An auxiliary branch whose upstream fails yields an
 * empty list and is reported in the status instead of failing the whole
 * context; a genuinely empty relation (no catalog key, 404 for a derived
 * identifier) is a complete result. Failures that are not upstream failures
 * (programming errors) propagate.
 */
@Injectable()
export class ServiceContextAssembler {
  private readonly logger = new Logger(ServiceContextAssembler.name);

  constructor(
    private readonly pvogSearchClient: PvogSearchClient,
    private readonly pvogAuthorityClient: PvogAuthorityClient,
    private readonly fimPortalClient: FimPortalClient,
  ) {}

  async assemble(
    serviceId: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<ServiceContext> {
    const detail = await this.pvogSearchClient.getServiceDescription(
      serviceId,
      regionalKey,
      useRegionalHierarchy,
    );
    const serviceCatalogKeys = [...new Set(detail.service.serviceCatalogKeys)];

    const [authorities, onlineServices, [catalogEntries, masterTexts]] =
      await Promise.all([
        this.loadPart(ServiceContextPart.Authorities, () =>
          this.listServiceAuthorities(detail.authorityReferences, {
            serviceId,
            regionalKey,
          }),
        ),
        this.loadPart(ServiceContextPart.OnlineServices, () =>
          serviceCatalogKeys.length === 0
            ? Promise.resolve([])
            : this.pvogSearchClient.listOnlineServices(
                regionalKey,
                serviceCatalogKeys,
              ),
        ),
        this.loadCatalogEntriesWithMasterTexts(serviceCatalogKeys),
      ]);

    const parts: [ServiceContextPart, PartResult<unknown>][] = [
      [ServiceContextPart.Authorities, authorities],
      [ServiceContextPart.OnlineServices, onlineServices],
      [ServiceContextPart.CatalogEntries, catalogEntries],
      [ServiceContextPart.MasterTexts, masterTexts],
    ];
    const unavailableParts = parts
      .filter(([, part]) => !part.available)
      .map(([name]) => name);

    return {
      service: detail.service,
      authorities: authorities.value,
      onlineServices: onlineServices.value,
      catalogEntries: catalogEntries.value,
      masterTexts: masterTexts.value,
      status: {
        complete: unavailableParts.length === 0,
        unavailableParts,
      },
    };
  }

  private async listServiceAuthorities(
    references: ServiceAuthorityReference[],
    scope: AuthorityDetailScope,
  ): Promise<ServiceAuthority[]> {
    const authorities = await this.pvogAuthorityClient.listAuthorities(
      references,
      scope,
    );

    return authorities.map((authority, index) => ({
      authority,
      role: references[index].role,
    }));
  }

  /**
   * Master texts are addressed by identifiers taken from the catalog
   * entries, so they are unavailable whenever the catalog entries are.
   */
  private async loadCatalogEntriesWithMasterTexts(
    serviceCatalogKeys: string[],
  ): Promise<[PartResult<CatalogEntry>, PartResult<ParsedMasterText>]> {
    const catalogEntries = await this.loadPart(
      ServiceContextPart.CatalogEntries,
      () => this.listCatalogEntries(serviceCatalogKeys),
    );

    if (!catalogEntries.available) {
      return [catalogEntries, { value: [], available: false }];
    }

    const masterTexts = await this.loadPart(
      ServiceContextPart.MasterTexts,
      () => this.listMasterTexts(catalogEntries.value),
    );

    return [catalogEntries, masterTexts];
  }

  /**
   * One catalog lookup per distinct key; a key the catalog does not know
   * (404) is skipped as a genuine absence.
   */
  private async listCatalogEntries(
    serviceCatalogKeys: string[],
  ): Promise<CatalogEntry[]> {
    const entries = await Promise.all(
      serviceCatalogKeys.map((key) =>
        this.absentAsNull(this.fimPortalClient.getCatalogEntry(key)),
      ),
    );

    return entries.filter((entry) => entry !== null);
  }

  /**
   * One master text per distinct editorial office + service id; a pair
   * without a published master text (404) is skipped as a genuine absence.
   */
  private async listMasterTexts(
    catalogEntries: CatalogEntry[],
  ): Promise<ParsedMasterText[]> {
    const identifiers = new Map<string, CatalogEntry>();

    for (const entry of catalogEntries) {
      identifiers.set(`${entry.editorialOfficeId}/${entry.serviceId}`, entry);
    }

    const texts = await Promise.all(
      [...identifiers.values()].map((entry) =>
        this.absentAsNull(
          this.fimPortalClient.getParsedMasterText(
            entry.editorialOfficeId,
            entry.serviceId,
          ),
        ),
      ),
    );

    return texts.filter((text) => text !== null);
  }

  private async loadPart<T>(
    part: ServiceContextPart,
    load: () => Promise<T[]>,
  ): Promise<PartResult<T>> {
    try {
      return { value: await load(), available: true };
    } catch (error) {
      if (!(error instanceof IntegrationException)) {
        throw error;
      }

      this.logger.warn(
        `${part} unavailable for the service context: ${error.name}`,
      );

      return { value: [], available: false };
    }
  }

  private absentAsNull<T>(request: Promise<T>): Promise<T | null> {
    return request.catch((error: unknown) => {
      if (error instanceof UpstreamHttpException && error.status === 404) {
        return null;
      }

      throw error;
    });
  }
}
