import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Query parameters of GET /master-texts/{editorialOfficeId}/{serviceId}.
 */
export class GetMasterTextQuery {
  /**
   * Upstream text source variant; defaults to "primary".
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  source?: string;
}
