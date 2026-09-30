import { Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { WireServiceDescription } from '../../../wire/WireServiceDescription';

/**
 * PVOG wire model (v7 service search): one page of full service
 * descriptions with the page totals inlined next to the content.
 */
export class WireV7ServiceDescriptionPage {
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
