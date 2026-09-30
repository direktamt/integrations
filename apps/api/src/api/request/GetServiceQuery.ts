import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters of GET /services/{id}.
 */
export class GetServiceQuery {
  /**
   * Regional key (ARS) the description is requested for; the upstream API
   * requires it to pick the territory-specific variant.
   */
  @IsString()
  @IsNotEmpty()
  regionalKey!: string;

  /**
   * Include services published for parent territories (state, federal).
   */
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  useRegionalHierarchy: boolean = true;
}
