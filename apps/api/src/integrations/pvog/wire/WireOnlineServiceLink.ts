import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: entry link of an online application service.
 */
export class WireOnlineServiceLink {
  /**
   * URL of the online application (JSON: `uri`).
   */
  @Expose({ name: 'uri' })
  @IsOptional()
  @IsString()
  url?: string;

  /**
   * Link text as published.
   */
  @Expose()
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * Optional explanatory text next to the link.
   */
  @Expose()
  @IsOptional()
  @IsString()
  description?: string;
}
