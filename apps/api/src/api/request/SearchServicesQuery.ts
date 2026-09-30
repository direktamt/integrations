import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Query parameters of GET /services.
 */
export class SearchServicesQuery {
  /**
   * Regional key (ARS) resolved via GET /locations.
   */
  @IsString()
  @IsNotEmpty()
  regionalKey!: string;

  /**
   * Plain-language description of the task.
   */
  @IsString()
  @IsNotEmpty()
  query!: string;

  /**
   * Page size; the upstream API accepts 5 to 9999.
   */
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(9999)
  size: number = 10;

  /**
   * Zero-based page index; the upstream API accepts 0 to 100.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  page: number = 0;

  /**
   * Tolerate typos in the query.
   */
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  fuzzySearch: boolean = true;

  /**
   * Include services published for parent territories (state, federal).
   */
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  useRegionalHierarchy: boolean = true;

  /**
   * Comma-separated life-situation codes.
   */
  @IsOptional()
  @Transform(({ value }): string[] =>
    Array.isArray(value) ? (value as string[]) : String(value).split(','),
  )
  @IsString({ each: true })
  lifeSituationCodes?: string[];

  /**
   * Only descriptions valid at this date (ISO 8601).
   */
  @IsOptional()
  @IsDateString()
  validDate?: string;
}
