import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
   * Maximum number of results.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
