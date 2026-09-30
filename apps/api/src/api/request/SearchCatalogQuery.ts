import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Query parameters of GET /catalog.
 */
export class SearchCatalogQuery {
  /**
   * Search term for the federal service catalog.
   */
  @IsString()
  @IsNotEmpty()
  term!: string;

  /**
   * Maximum number of results; the upstream API accepts 1 to 200.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  /**
   * Number of results to skip.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
