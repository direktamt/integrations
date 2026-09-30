import { Expose, Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { WireAuthorityRole } from './WireAuthorityRole';

/**
 * PVOG wire model: reduced view of an organisation unit responsible for a
 * service, as listed in the service detail (`organisations[]`).
 */
export class WireAuthorityReference {
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
   * Role of the unit for the service in the requested territory.
   */
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => WireAuthorityRole)
  role?: WireAuthorityRole;
}
