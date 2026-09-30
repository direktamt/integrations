import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: one address of an organisation unit.
 */
export class WireAuthorityAddress {
  /**
   * Address-type code (XZuFi code list `xzufi.anschrifttyp`), e.g. "001".
   */
  @Expose()
  @IsOptional()
  @IsString()
  code?: string;

  /**
   * Resolved address-type label, e.g. "Hausanschrift".
   */
  @Expose()
  @IsOptional()
  @IsString()
  type?: string;

  @Expose()
  @IsOptional()
  @IsString()
  street?: string;

  @Expose()
  @IsOptional()
  @IsString()
  houseNumber?: string;

  /**
   * Postal code (JSON: `zip`).
   */
  @Expose({ name: 'zip' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @Expose()
  @IsOptional()
  @IsString()
  city?: string;

  /**
   * Post-office box (JSON: `postbox`).
   */
  @Expose({ name: 'postbox' })
  @IsOptional()
  @IsString()
  postBox?: string;
}
