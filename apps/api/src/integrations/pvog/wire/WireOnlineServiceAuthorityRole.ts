import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: one responsibility of an organisation unit for an online
 * service. The upstream entry also carries `lbId`, `leikakeys` and `ars`
 * of the responsibility; only the role is consumed.
 */
export class WireOnlineServiceAuthorityRole {
  /**
   * Role name from the upstream enumeration, e.g. "COMPETENT_OFFICE".
   */
  @Expose()
  @IsOptional()
  @IsString()
  role?: string;
}
