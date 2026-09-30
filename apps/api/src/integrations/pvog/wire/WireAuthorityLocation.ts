import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { WireAuthorityAddress } from './WireAuthorityAddress';
import { WireAuthorityContact } from './WireAuthorityContact';
import { WireLink } from './WireLink';

/**
 * PVOG wire model: where and how an organisation unit can be reached
 * (XZuFi `anschrift` and `erreichbarkeit`).
 */
export class WireAuthorityLocation {
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireAuthorityAddress)
  addresses?: WireAuthorityAddress[];

  /**
   * Contact channels (JSON: `communications`).
   */
  @Expose({ name: 'communications' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireAuthorityContact)
  contacts?: WireAuthorityContact[];

  /**
   * Web addresses attached to the location.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireLink)
  urls?: WireLink[];
}
