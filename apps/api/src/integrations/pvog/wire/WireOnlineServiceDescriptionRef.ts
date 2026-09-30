import { Expose } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: reference from an online service to the service descriptions it covers.
 */
export class WireOnlineServiceDescriptionRef {
  /**
   * Id of the referenced service description (JSON: `lbId`).
   */
  @Expose({ name: 'lbId' })
  @IsOptional()
  @IsString()
  serviceDescriptionId?: string;

  /**
   * ARS keys of the territories the reference applies to (JSON: `ars`).
   */
  @Expose({ name: 'ars' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regionalKeys?: string[];

  /**
   * LeiKa keys of the covered services (JSON: `leikakeys`).
   */
  @Expose({ name: 'leikakeys' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCatalogKeys?: string[];
}
