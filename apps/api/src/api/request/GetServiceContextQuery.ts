import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters of GET /services/{id}/context.
 */
export class GetServiceContextQuery {
  /**
   * Regional key (ARS) the service, its authorities and online services are
   * resolved for.
   */
  @IsString()
  @IsNotEmpty()
  regionalKey!: string;

  /**
   * Include data published for parent territories (state, federal).
   */
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  useRegionalHierarchy: boolean = true;
}
