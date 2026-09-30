import {
  AuthorityAddressType,
  AuthorityContactType,
  AuthorityRole,
  type AuthorityAddress,
  type AuthorityContact,
  type PublicAuthority,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../config';
import { BaseHttpClient } from '../common/BaseHttpClient';
import { WireAuthority } from './wire/WireAuthority';
import { WireAuthorityAddress } from './wire/WireAuthorityAddress';
import { WireAuthorityContact } from './wire/WireAuthorityContact';
import { WireAuthorityReference } from './wire/WireAuthorityReference';
import { WireServiceDescription } from './wire/WireServiceDescription';

/**
 * Adapter for the organisation-unit resources of the public PVOG Suchdienst
 * API: which authorities are responsible for a service in a territory and
 * how to reach them.
 * Docs: GET {baseUrl}/v3/api-docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, section 1.5.
 */
@Injectable()
export class PvogAuthorityClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;

  /**
   * Authorities responsible for one service within a territory, with their
   * addresses, contact channels and websites. Two upstream calls are
   * composed: the service detail lists the responsible organisation units
   * with their roles (resolved along the territory hierarchy upstream), then
   * every unit's detail supplies its contact data. Empty when the service
   * names no authority.
   */
  async listServiceAuthorities(
    serviceId: string,
    regionalKey: string,
    useRegionalHierarchy: boolean,
  ): Promise<PublicAuthority[]> {
    const service = await this.getModel(
      WireServiceDescription,
      `/v6/servicedescriptions/${encodeURIComponent(serviceId)}/detail`,
      {
        ars: regionalKey,
        useArsHierarchy: useRegionalHierarchy,
      },
    );
    const references = service.authorities ?? [];

    const authorities = await Promise.all(
      references.map((reference) =>
        this.getModel(WireAuthority, '/v5/organisationunits/detail', {
          q: reference.id,
        }),
      ),
    );

    return references.map((reference, index) =>
      this.toAuthority(reference, authorities[index]),
    );
  }

  private toAuthority(
    reference: WireAuthorityReference,
    wire: WireAuthority,
  ): PublicAuthority {
    const links = [...(wire.location?.urls ?? []), ...(wire.websites ?? [])];

    return {
      id: wire.id,
      name: nonEmpty(wire.title) ?? nonEmpty(reference.title),
      role:
        PvogAuthorityClient.ROLE_BY_CODE.get(reference.role?.code ?? '') ??
        AuthorityRole.Other,
      addresses: (wire.location?.addresses ?? []).map((address) =>
        this.toAddress(address),
      ),
      contacts: (wire.location?.contacts ?? []).flatMap((contact) => {
        const value = nonEmpty(contact.value);

        return value === undefined ? [] : [this.toContact(contact, value)];
      }),
      websites: [
        ...new Set(
          links.flatMap((link) => {
            const url = nonEmpty(link.url);

            return url === undefined ? [] : [url];
          }),
        ),
      ],
    };
  }

  private toAddress(wire: WireAuthorityAddress): AuthorityAddress {
    return {
      type:
        PvogAuthorityClient.ADDRESS_TYPE_BY_CODE.get(wire.code ?? '') ??
        AuthorityAddressType.Other,
      street: nonEmpty(wire.street),
      houseNumber: nonEmpty(wire.houseNumber),
      postalCode: nonEmpty(wire.postalCode),
      city: nonEmpty(wire.city),
      postBox: nonEmpty(wire.postBox),
    };
  }

  private toContact(
    wire: WireAuthorityContact,
    value: string,
  ): AuthorityContact {
    return {
      type:
        PvogAuthorityClient.CONTACT_TYPE_BY_CODE.get(wire.code ?? '') ??
        AuthorityContactType.Other,
      value,
      label: nonEmpty(wire.name),
      description: nonEmpty(wire.valueAdditional),
    };
  }

  /**
   * XZuFi code list `xzufi.zustaendigkeitsrolle` → domain role. Code "01"
   * is not part of the current code-list version but is still published by
   * PVOG (observed live on 2026-09-30).
   */
  private static readonly ROLE_BY_CODE = new Map<string, AuthorityRole>([
    ['01', AuthorityRole.ResponsibleAuthorityAndContactPoint],
    ['02', AuthorityRole.ResponsibleAuthority],
    ['03', AuthorityRole.ContactPoint],
    ['11', AuthorityRole.SinglePointOfContact],
    ['19', AuthorityRole.OtherSinglePointOfContact],
  ]);

  /**
   * XZuFi code list `xzufi.anschrifttyp` (version 4) → domain address type.
   */
  private static readonly ADDRESS_TYPE_BY_CODE = new Map<
    string,
    AuthorityAddressType
  >([
    ['001', AuthorityAddressType.Visiting],
    ['005', AuthorityAddressType.Delivery],
    ['006', AuthorityAddressType.Postal],
  ]);

  /**
   * XÖV code list `urn:de:xoev:codeliste:erreichbarkeit` (version 4.1) →
   * domain contact type; channels without a mapping become Other.
   */
  private static readonly CONTACT_TYPE_BY_CODE = new Map<
    string,
    AuthorityContactType
  >([
    ['01', AuthorityContactType.Email],
    ['02', AuthorityContactType.Phone],
    ['03', AuthorityContactType.Phone],
    ['04', AuthorityContactType.Fax],
    ['09', AuthorityContactType.Web],
    ['10', AuthorityContactType.Web],
  ]);
}

/**
 * Upstream publishes empty strings for absent values; the domain contract
 * omits them instead.
 */
function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.trim() !== '' ? value : undefined;
}
