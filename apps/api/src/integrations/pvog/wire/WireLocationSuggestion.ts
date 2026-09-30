import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

/**
 * PVOG wire model: one autocomplete hit for the city input field.
 */
export class WireLocationSuggestion {
  /**
   * Display name of the city, district or postal-code area.
   */
  @Expose()
  @IsString()
  name!: string;

  /**
   * Search relevance score; higher = better match (JSON: `weight`).
   */
  @Expose({ name: 'weight' })
  @IsNumber()
  relevance!: number;
}
