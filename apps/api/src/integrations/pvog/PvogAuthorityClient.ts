import {
  AuthorityAddressType,
  AuthorityContactType,
  type AuthorityAddress,
  type AuthorityContact,
  type PublicAuthority,
} from '@direktamt/integrations-contracts';
import { Injectable } from '@nestjs/common';
import { CONFIG } from '../../config';
import { BaseHttpClient } from '../common/BaseHttpClient';
import { nonEmpty } from '../common/OptionalText';
import { AuthorityReference } from './model/AuthorityReference';
import { WireAuthority } from './wire/WireAuthority';
import { WireAuthorityAddress } from './wire/WireAuthorityAddress';
import { WireAuthorityContact } from './wire/WireAuthorityContact';

/**
 * Adapter for the organisation-unit resource of the public PVOG Suchdienst
 * API: how the authorities responsible for a service can be reached.
 * Docs: GET {baseUrl}/v3/api-docs
 * Handbook: apps/api/docs/INTEGRATIONS.md, section 1.5.
 */
@Injectable()
export class PvogAuthorityClient extends BaseHttpClient {
  protected readonly baseUrl = CONFIG.integrations.pvogSearchBaseUrl;

  /**
   * Contact data of the referenced organisation units, in the order of the
   * references. Every unit is one upstream call, issued in parallel; the
   * role comes from the reference because the service detail resolves it
   * for the requested territory.
   */
  async listAuthorities(
    references: AuthorityReference[],
  ): Promise<PublicAuthority[]> {
    const units = await Promise.all(
      references.map((reference) =>
        this.getModel(WireAuthority, '/v5/organisationunits/detail', {
          q: reference.id,
        }),
      ),
    );

    return references.map((reference, index) =>
      this.toAuthority(reference, units[index]),
    );
  }

  private toAuthority(
    reference: AuthorityReference,
    wire: WireAuthority,
  ): PublicAuthority {
    const links = [...(wire.location?.urls ?? []), ...(wire.websites ?? [])];

    return {
      id: wire.id,
      name: nonEmpty(wire.title) ?? reference.name,
      role: reference.role,
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
