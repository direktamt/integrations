import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: a link published inside a service-description section.
 */
export class WireLink {
  /**
   * Target URL (JSON: `uri`).
   */
  @Expose({ name: 'uri' })
  @IsOptional()
  @IsString()
  url?: string;

  /**
   * Link text as published by the authority.
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
