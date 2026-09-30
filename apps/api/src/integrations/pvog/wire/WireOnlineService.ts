import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WireOnlineServiceDescriptionRef } from './WireOnlineServiceDescriptionRef';
import { WireOnlineServiceLink } from './WireOnlineServiceLink';

/**
 * PVOG wire model: an online application service (direct submission).
 */
export class WireOnlineService {
  /**
   * PVOG-internal id of the online service.
   */
  @Expose()
  @IsOptional()
  @IsString()
  id?: string;

  /**
   * Name of the online application as published.
   */
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Optional description of what can be applied for.
   */
  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Last-change timestamp in the publishing source system
   * (JSON: `externalLastUpdate`).
   */
  @Expose({ name: 'externalLastUpdate' })
  @IsOptional()
  @IsString()
  lastUpdatedAt?: string;

  /**
   * Entry links to the online application.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireOnlineServiceLink)
  links?: WireOnlineServiceLink[];

  /**
   * Service descriptions (and thus LeiKa keys) this application covers.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireOnlineServiceDescriptionRef)
  serviceDescriptions?: WireOnlineServiceDescriptionRef[];
}
