import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { WireLink } from './WireLink';

/**
 * PVOG wire model: one content section of a service description.
 */
export class WireServiceSection {
  /**
   * XZuFi type discriminator of the section (JSON name: `@type`).
   */
  @Expose({ name: '@type' })
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Internal section code.
   */
  @Expose()
  @IsOptional()
  @IsString()
  code?: string;

  /**
   * Section heading as published (German), e.g. "Erforderliche Unterlagen".
   */
  @Expose()
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * Section body as raw HTML as provided by PVOG (JSON: `text`).
   */
  @Expose({ name: 'text' })
  @IsOptional()
  @IsString()
  htmlText?: string;

  /**
   * XZuFi category code of the section.
   */
  @Expose()
  @IsOptional()
  @IsString()
  xZufiCategory?: string;

  /**
   * Links published inside the section (forms, online services, laws).
   */
  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WireLink)
  links?: WireLink[];

  /**
   * Whether the authority actually filled the section with content.
   */
  @Expose()
  @IsOptional()
  @IsBoolean()
  filled?: boolean;

  /**
   * Whether the text is boilerplate rather than real local content.
   */
  @Expose()
  @IsOptional()
  @IsBoolean()
  placeholder?: boolean;
}
