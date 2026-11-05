import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { WireServiceCatalogHierarchyMeta } from './WireServiceCatalogHierarchyMeta';
import { WireServiceDescription } from './WireServiceDescription';

/**
 * PVOG wire model: one page of `GET /v2/servicedescriptions/leikahierarchy`,
 * full service descriptions plus the match metadata. The metadata is
 * required: without it a hit cannot be classified as exact or not.
 */
export class WireServiceCatalogHierarchyPage {
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
   * Whether the hits match the requested keys exactly.
   */
  @Expose()
  @IsDefined()
  @ValidateNested()
  @Type(() => WireServiceCatalogHierarchyMeta)
  meta!: WireServiceCatalogHierarchyMeta;

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
