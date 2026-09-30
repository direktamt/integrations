import { Expose } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

/**
 * PVOG wire model (v8beta1 service search): page metadata delivered next
 * to the content instead of inlined into the page.
 */
export class WireV8PageMetadata {
  /**
   * Requested page size.
   */
  @Expose()
  @IsOptional()
  @IsNumber()
  size?: number;

  /**
   * Zero-based page index.
   */
  @Expose()
  @IsOptional()
  @IsNumber()
  number?: number;

  /**
   * Total matches across all pages.
   */
  @Expose()
  @IsOptional()
  @IsNumber()
  totalElements?: number;

  /**
   * Total number of pages.
   */
  @Expose()
  @IsOptional()
  @IsNumber()
  totalPages?: number;
}
