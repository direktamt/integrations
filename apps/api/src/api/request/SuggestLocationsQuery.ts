import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters of GET /locations/suggestions.
 */
export class SuggestLocationsQuery {
  /**
   * Partial city name or postal code typed by the user.
   */
  @IsString()
  @IsNotEmpty()
  query!: string;
}
