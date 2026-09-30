import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { WireV8PageMetadata } from './WireV8PageMetadata';
import { WireV8ServiceSearchHit } from './WireV8ServiceSearchHit';

/**
 * PVOG wire model (v8beta1 service search): one page of search hits with
 * a separate page-metadata object.
 */
export class WireV8ServiceSearchPage {
  /**
   * Search hits on this page.
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireV8ServiceSearchHit)
  content?: WireV8ServiceSearchHit[];

  /**
   * Page size, index and totals.
   */
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => WireV8PageMetadata)
  page?: WireV8PageMetadata;
}
