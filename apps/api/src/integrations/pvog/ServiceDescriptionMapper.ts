import {
  AuthorityRole,
  ServiceSectionType,
  type PublicServiceDescription,
  type ServiceSection,
} from '@direktamt/integrations-contracts';
import { nonEmpty } from '../common/OptionalText';
import { ServiceAuthorityReference } from './model/ServiceAuthorityReference';
import { WireAuthorityReference } from './wire/WireAuthorityReference';
import { WireServiceDescription } from './wire/WireServiceDescription';
import { WireServiceSection } from './wire/WireServiceSection';

/**
 * Mapping of the PVOG service-description wire model to the public
 * contract, shared by the detail endpoint and every service-search adapter
 * that delivers full descriptions.
 */
export function toServiceDescription(
  wire: WireServiceDescription,
): PublicServiceDescription {
  return {
    id: wire.id,
    serviceCatalogKeys: wire.serviceCatalogKeys ?? [],
    title: wire.title,
    summary: wire.summary,
    regionalKeys: wire.regionalKeys ?? [],
    federalStateKeys: wire.federalStateKeys,
    targetAudiences: wire.addressees,
    availableLanguages: wire.availableLanguages ?? [],
    sections: (wire.sections ?? []).map((section) => toSection(section)),
  };
}

export function toAuthorityReference(
  wire: WireAuthorityReference,
): ServiceAuthorityReference {
  return {
    id: wire.id,
    name: nonEmpty(wire.title),
    role: ROLE_BY_CODE.get(wire.role?.code ?? '') ?? AuthorityRole.Other,
  };
}

function toSection(wire: WireServiceSection): ServiceSection {
  return {
    type:
      SECTION_TYPE_BY_TITLE.get(wire.title ?? '') ?? ServiceSectionType.Other,
    originalTitle: wire.title,
    htmlText: wire.htmlText,
    links: (wire.links ?? []).map((link) => ({
      url: link.url,
      title: link.title,
      description: link.description,
    })),
  };
}

/**
 * XZuFi code list `xzufi.zustaendigkeitsrolle` → domain role. Code "01"
 * is not part of the current code-list version but is still published by
 * PVOG (observed live on 2026-09-30).
 */
const ROLE_BY_CODE = new Map<string, AuthorityRole>([
  ['01', AuthorityRole.ResponsibleAuthorityAndContactPoint],
  ['02', AuthorityRole.ResponsibleAuthority],
  ['03', AuthorityRole.ContactPoint],
  ['11', AuthorityRole.SinglePointOfContact],
  ['19', AuthorityRole.OtherSinglePointOfContact],
]);

/**
 * Published section titles → domain section type; unknown titles fall back to Other.
 */
const SECTION_TYPE_BY_TITLE = new Map<string, ServiceSectionType>([
  ['Kurzinfo', ServiceSectionType.ShortInfo],
  ['Leistungsbezeichnung', ServiceSectionType.ServiceName],
  ['Leistungsbezeichnung II (Leistungsname)', ServiceSectionType.ServiceName],
  ['Beschreibung', ServiceSectionType.Description],
  ['Voraussetzungen', ServiceSectionType.Requirements],
  ['Erforderliche Unterlagen', ServiceSectionType.RequiredDocuments],
  ['Formulare', ServiceSectionType.Forms],
  ['Kosten & Gebühren', ServiceSectionType.Fees],
  ['Fristen', ServiceSectionType.Deadlines],
  ['Verfahrensablauf', ServiceSectionType.Procedure],
  ['Bearbeitungsdauer', ServiceSectionType.ProcessingTime],
  ['Rechtsgrundlage(n)', ServiceSectionType.LegalBasis],
  ['Rechtsbehelf', ServiceSectionType.LegalRemedy],
  ['Zuständige Stelle', ServiceSectionType.ResponsibleAuthority],
  ['Ansprechpunkt', ServiceSectionType.ContactPoint],
  ['weiterführende Informationen', ServiceSectionType.FurtherInformation],
]);
