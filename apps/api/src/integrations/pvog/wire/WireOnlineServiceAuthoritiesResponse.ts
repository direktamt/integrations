import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WireOnlineServiceAuthority } from './WireOnlineServiceAuthority';

/**
 * PVOG wire model: envelope of the online-service organisations endpoint.
 */
export class WireOnlineServiceAuthoritiesResponse {
  /**
   * Responsible organisation units (JSON: `organisations`).
   */
  @Expose({ name: 'organisations' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireOnlineServiceAuthority)
  authorities?: WireOnlineServiceAuthority[];

  /**
   * Last-change timestamp of the online service in the publishing source
   * system (JSON: `externalLastUpdate`).
   */
  @Expose({ name: 'externalLastUpdate' })
  @IsOptional()
  @IsString()
  lastUpdatedAt?: string;
}
