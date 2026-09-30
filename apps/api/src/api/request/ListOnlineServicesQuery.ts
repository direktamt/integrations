import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Query parameters of GET /online-services.
 */
export class ListOnlineServicesQuery {
  /**
   * Regional key (ARS) of the territory.
   */
  @IsString()
  @IsNotEmpty()
  regionalKey!: string;

  /**
   * Comma-separated LeiKa service catalog keys to filter by.
   */
  @IsOptional()
  @Transform(({ value }): string[] =>
    Array.isArray(value) ? (value as string[]) : String(value).split(','),
  )
  @IsString({ each: true })
  serviceCatalogKeys?: string[];
}
