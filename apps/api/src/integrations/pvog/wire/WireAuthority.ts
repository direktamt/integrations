import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WireAuthorityLocation } from './WireAuthorityLocation';
import { WireLink } from './WireLink';

/**
 * PVOG wire model: detail view of one organisation unit (Organisationseinheit).
 * Contact persons, forms, bank accounts and opening hours are not consumed.
 */
export class WireAuthority {
  /**
   * PVOG-internal id of the organisation unit.
   */
  @Expose()
  @IsString()
  id!: string;

  /**
   * Name of the organisation unit as published.
   */
  @Expose()
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * Addresses, contact channels and location-level web addresses.
   */
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => WireAuthorityLocation)
  location?: WireAuthorityLocation;

  /**
   * Web addresses of the unit (JSON: `internetAddresses`).
   */
  @Expose({ name: 'internetAddresses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireLink)
  websites?: WireLink[];
}
