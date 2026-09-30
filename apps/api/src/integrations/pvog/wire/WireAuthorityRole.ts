import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: responsibility role of an organisation unit for a service
 * (XZuFi code list `xzufi.zustaendigkeitsrolle`).
 */
export class WireAuthorityRole {
  /**
   * Code from the code list, e.g. "02".
   */
  @Expose()
  @IsOptional()
  @IsString()
  code?: string;

  /**
   * Resolved code-list label, e.g. "Zuständige Stelle".
   */
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;
}
