import { Expose, Type } from 'class-transformer';
import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { WireCatalogEntry } from './WireCatalogEntry';

/**
 * FIM wire model: paginated envelope of the catalog search endpoint.
 */
export class WireCatalogSearchResponse {
  /**
   * Catalog entries on this page (JSON: `items`).
   */
  @Expose({ name: 'items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireCatalogEntry)
  entries!: WireCatalogEntry[];

  /**
   * Offset the page starts at.
   */
  @Expose()
  @IsInt()
  offset!: number;

  /**
   * Requested page size.
   */
  @Expose()
  @IsInt()
  limit!: number;

  /**
   * Number of items on this page.
   */
  @Expose()
  @IsInt()
  count!: number;

  /**
   * Total matches across all pages (JSON: `total_count`).
   */
  @Expose({ name: 'total_count' })
  @IsInt()
  totalCount!: number;
}
