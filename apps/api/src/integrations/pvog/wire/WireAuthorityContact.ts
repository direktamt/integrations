import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: one contact channel of an organisation unit
 * (XÖV code list `urn:de:xoev:codeliste:erreichbarkeit`).
 */
export class WireAuthorityContact {
  /**
   * Channel code from the code list, e.g. "02".
   */
  @Expose()
  @IsOptional()
  @IsString()
  code?: string;

  /**
   * Resolved channel label, e.g. "Telefon Festnetz".
   */
  @Expose()
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * The number, address or URL.
   */
  @Expose()
  @IsOptional()
  @IsString()
  value?: string;

  /**
   * Explanatory text published next to the value.
   */
  @Expose()
  @IsOptional()
  @IsString()
  valueAdditional?: string;
}
