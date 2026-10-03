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
import { UpstreamProvider } from '../common/UpstreamProvider';
import { mapConcurrently } from '../common/Concurrency';
import { nonEmpty } from '../common/OptionalText';
import { AuthorityReference } from './model/AuthorityReference';
import { OnlineServiceAuthorityReference } from './model/OnlineServiceAuthorityReference';
import { WireAuthority } from './wire/WireAuthority';
import { WireAuthorityAddress } from './wire/WireAuthorityAddress';
import { WireAuthorityContact } from './wire/WireAuthorityContact';
import { WireOnlineServiceAuthoritiesResponse } from './wire/WireOnlineServiceAuthoritiesResponse';
import { WireOnlineServiceAuthority } from './wire/WireOnlineServiceAuthority';

/**
 * Adapter for the organisation-unit resources of the public PVOG Suchdienst
 * API: how the authorities responsible for a service or an online service
 * can be reached.
 * Docs: GET {baseUrl}/v3/api-docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, sections 1.5 and 1.7.
 */
@Injectable()
export class PvogAuthorityClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;
  protected readonly provider: UpstreamProvider = 'PVOG';

  /**
   * Upper bound on organisation-unit detail requests in flight for one
   * relation; a relation may name many units.
   */
  private static readonly AUTHORITY_DETAIL_CONCURRENCY = 8;

  /**
   * Contact data of the referenced organisation units, in the order of the
   * references. Every unit is one upstream call; calls run in parallel up
   * to AUTHORITY_DETAIL_CONCURRENCY. Callers de-duplicate references so
   * that no unit is loaded twice.
   */
  async listAuthorities(
    references: AuthorityReference[],
  ): Promise<PublicAuthority[]> {
    const units = await mapConcurrently(
      references,
      PvogAuthorityClient.AUTHORITY_DETAIL_CONCURRENCY,
      (reference) =>
        this.getModel(
          WireAuthority,
          '/v5/organisationunits/detail',
          { q: reference.id },
          { cacheable: true },
        ),
    );

    return references.map((reference, index) =>
      this.toAuthority(reference, units[index]),
    );
  }

  /**
   * Organisation units responsible for an online service with their roles
   * (beta upstream endpoint). A unit listed more than once is merged into
   * one reference with the union of its roles, in first-seen order.
   */
  async listOnlineServiceAuthorityReferences(
    onlineServiceId: string,
  ): Promise<OnlineServiceAuthorityReference[]> {
    const wire = await this.getModel(
      WireOnlineServiceAuthoritiesResponse,
      `/v1beta2/onlineservices/${encodeURIComponent(onlineServiceId)}/organisations`,
    );
    const references = new Map<string, OnlineServiceAuthorityReference>();

    for (const item of wire.authorities ?? []) {
      const roles = this.toRoles(item);
      const existing = references.get(item.id);

      if (existing) {
        existing.name ??= nonEmpty(item.name);
        existing.roles = [...new Set([...existing.roles, ...roles])];
      } else {
        references.set(item.id, {
          id: item.id,
          name: nonEmpty(item.name),
          roles,
        });
      }
    }

    return [...references.values()];
  }

  private toRoles(wire: WireOnlineServiceAuthority): AuthorityRole[] {
    return [
      ...new Set(
        (wire.roles ?? []).map(
          (entry) =>
            PvogAuthorityClient.ONLINE_SERVICE_ROLE_BY_NAME.get(
              entry.role ?? '',
            ) ?? AuthorityRole.Other,
        ),
      ),
    ];
  }

  private toAuthority(
    reference: AuthorityReference,
    wire: WireAuthority,
  ): PublicAuthority {
    const links = [...(wire.location?.urls ?? []), ...(wire.websites ?? [])];

    return {
      id: wire.id,
      name: nonEmpty(wire.title) ?? reference.name,
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
   * Role enumeration of the online-service organisations endpoint → domain
   * role. Unknown names (including the upstream "UNKNOWN") become Other.
   */
  private static readonly ONLINE_SERVICE_ROLE_BY_NAME = new Map<
    string,
    AuthorityRole
  >([
    ['COMPETENT_OFFICE', AuthorityRole.ResponsibleAuthority],
    ['CONTACT_POINT', AuthorityRole.ContactPoint],
    ['SINGLE_POINT_OF_CONTACT', AuthorityRole.SinglePointOfContact],
    ['OTHER_SINGLE_POINT_OF_CONTACT', AuthorityRole.OtherSinglePointOfContact],
    ['PROFESSIONAL_POINT_OF_CONTACT', AuthorityRole.ProfessionalPointOfContact],
    ['TECHNICAL_POINT_OF_CONTACT', AuthorityRole.TechnicalPointOfContact],
    [
      'TECHNICAL_CONTACT_FOR_THE_OPERATING_PLATFORM',
      AuthorityRole.TechnicalContactForOperatingPlatform,
    ],
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
