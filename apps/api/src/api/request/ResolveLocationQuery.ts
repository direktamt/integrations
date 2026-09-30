import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

/**
 * Query parameters of GET /locations. At least one of the two
 * criteria must be present.
 */
export class ResolveLocationQuery {
  /**
   * Full city name, e.g. "Bonn".
   */
  @ValidateIf((o: ResolveLocationQuery) => o.postalCode === undefined)
  @IsString()
  @IsNotEmpty()
  cityName?: string;

  /**
   * German postal code, e.g. "53111".
   */
  @ValidateIf((o: ResolveLocationQuery) => o.cityName === undefined)
  @IsString()
  @IsNotEmpty()
  postalCode?: string;
}
