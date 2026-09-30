import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WireServiceSection } from './WireServiceSection';

/**
 * PVOG wire model: one public service as described for a territory.
 */
export class WireServiceDescription {
  /**
   * PVOG-internal id of the service description.
   */
  @Expose()
  @IsOptional()
  @IsString()
  id?: string;

  /**
   * LeiKa keys — canonical 14-digit service identifiers (JSON: `leikakeys`).
   */
  @Expose({ name: 'leikakeys' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCatalogKeys?: string[];

  /**
   * Service name (JSON: `name`); may be empty — the name may live in a ServiceName section.
   */
  @Expose({ name: 'name' })
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * Short plain-text summary of the service (JSON: `description`).
   */
  @Expose({ name: 'description' })
  @IsOptional()
  @IsString()
  summary?: string;

  /**
   * ARS keys of the territories this description applies to (JSON: `ars`).
   */
  @Expose({ name: 'ars' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regionalKeys?: string[];

  /**
   * ARS keys of the corresponding federal states.
   */
  @Expose({ name: 'arsFederalstate' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  federalStateKeys?: string[];

  /**
   * Target audiences (citizens, businesses, ...).
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addressees?: string[];

  /**
   * Languages the description is available in.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableLanguages?: string[];

  /**
   * Content sections: requirements, documents, fees, ... (JSON: `details`).
   */
  @Expose({ name: 'details' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireServiceSection)
  sections?: WireServiceSection[];
}
