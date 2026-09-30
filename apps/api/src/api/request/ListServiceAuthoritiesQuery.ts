import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters of GET /services/{id}/authorities.
 */
export class ListServiceAuthoritiesQuery {
  /**
   * Regional key (ARS) the responsibilities are resolved for; the upstream
   * API requires it to pick the territory-specific authorities.
   */
  @IsString()
  @IsNotEmpty()
  regionalKey!: string;

  /**
   * Include authorities published for parent territories (state, federal).
   */
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  useRegionalHierarchy: boolean = true;
}
