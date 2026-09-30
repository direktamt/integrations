import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { WireOnlineService } from './WireOnlineService';

/**
 * PVOG wire model: paginated envelope of the online-services endpoint.
 */
export class WireOnlineServicesResponse {
  /**
   * Cursor for the next page; empty string on the last page.
   */
  @Expose()
  @IsOptional()
  @IsString()
  nextPageToken?: string;

  /**
   * Number of items on this page.
   */
  @Expose()
  @IsOptional()
  @IsNumber()
  hits?: number;

  /**
   * Total matches across all pages.
   */
  @Expose()
  @IsOptional()
  @IsNumber()
  totalHits?: number;

  /**
   * Online services on this page (JSON: `onlineservices`).
   */
  @Expose({ name: 'onlineservices' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireOnlineService)
  onlineServices?: WireOnlineService[];
}
