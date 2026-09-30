import { Expose } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * FIM wire model: one entry of the federal LeiKa service catalog.
 */
export class WireCatalogEntry {
  /**
   * LeiKa key — canonical 14-digit service id (JSON: `leistungsschluessel`).
   */
  @Expose({ name: 'leistungsschluessel' })
  @IsString()
  serviceCatalogKey!: string;

  /**
   * Id of the editorial office maintaining the entry (JSON: `redaktion_id`).
   */
  @Expose({ name: 'redaktion_id' })
  @IsString()
  editorialOfficeId!: string;

  /**
   * Id of the service within its editorial office (JSON: `leistung_id`).
   */
  @Expose({ name: 'leistung_id' })
  @IsString()
  serviceId!: string;

  /**
   * Catalog title of the service.
   */
  @Expose()
  @IsString()
  title!: string;

  /**
   * Official administrative name (JSON: `leistungsbezeichnung`).
   */
  @Expose({ name: 'leistungsbezeichnung' })
  @IsOptional()
  @IsString()
  officialName?: string;

  /**
   * Citizen-facing name (JSON: `leistungsbezeichnung_2`).
   */
  @Expose({ name: 'leistungsbezeichnung_2' })
  @IsOptional()
  @IsString()
  citizenFacingName?: string | null;

  /**
   * Numeric editorial approval status (JSON: `freigabe_status`).
   */
  @Expose({ name: 'freigabe_status' })
  @IsOptional()
  @IsInt()
  approvalStatus?: number;

  /**
   * Creation timestamp, ISO 8601 (JSON: `erstellt_datum_zeit`).
   */
  @Expose({ name: 'erstellt_datum_zeit' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  /**
   * Last-modification timestamp, ISO 8601 (JSON: `geaendert_datum_zeit`).
   */
  @Expose({ name: 'geaendert_datum_zeit' })
  @IsOptional()
  @IsString()
  modifiedAt?: string;

  /**
   * LeiKa type codes of the service (JSON: `typisierung`).
   */
  @Expose({ name: 'typisierung' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  typeCodes?: string[];

  /**
   * Service type identifier (JSON: `leistungstyp`).
   */
  @Expose({ name: 'leistungstyp' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  /**
   * Legal basis as free text, one law per line (JSON: `rechtsgrundlagen`).
   */
  @Expose({ name: 'rechtsgrundlagen' })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  /**
   * EU Single Digital Gateway areas (JSON: `sdg_informationsbereiche`).
   */
  @Expose({ name: 'sdg_informationsbereiche' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sdgInformationAreas?: string[];
}
