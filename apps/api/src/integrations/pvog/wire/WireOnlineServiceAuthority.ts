import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WireOnlineServiceAuthorityRole } from './WireOnlineServiceAuthorityRole';

/**
 * PVOG wire model: an organisation unit responsible for an online service.
 * The upstream item also carries reduced `addresses`; the full contact data
 * is loaded from the organisation-unit detail instead.
 */
export class WireOnlineServiceAuthority {
  /**
   * PVOG-internal id of the organisation unit (JSON: `oeId`).
   */
  @Expose({ name: 'oeId' })
  @IsString()
  id!: string;

  /**
   * Name of the organisation unit as published.
   */
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Responsibilities of the unit for this online service.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireOnlineServiceAuthorityRole)
  roles?: WireOnlineServiceAuthorityRole[];
}
