import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { WireServiceDescription } from './WireServiceDescription';

/**
 * PVOG wire model: one page of service-description search results.
 */
export class WireServiceDescriptionPage {
  /**
   * Service descriptions on this page.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireServiceDescription)
  content?: WireServiceDescription[];

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
