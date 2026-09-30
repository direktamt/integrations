import { Expose } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model (v8beta1 service search): one search hit — a reduced view
 * of a service description. The hit also carries `name`, `teaser`,
 * `languageComplete` and `onlineServiceLinks`, which this project does not
 * consume; the full description is loaded from the detail endpoint.
 */
export class WireV8ServiceSearchHit {
  /**
   * PVOG-internal id of the service description.
   */
  @Expose()
  @IsString()
  id!: string;

  /**
   * ARS keys of the corresponding federal states ("00" for federal
   * descriptions); not part of the detail endpoint.
   */
  @Expose({ name: 'arsFederalstate' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  federalStateKeys?: string[];

  /**
   * ISO 639-1 codes of the languages the description is available in.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableLanguages?: string[];
}
