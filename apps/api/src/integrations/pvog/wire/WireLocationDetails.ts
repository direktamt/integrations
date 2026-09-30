import { Expose } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * PVOG wire model: a resolved territory with its official keys.
 */
export class WireLocationDetails {
  /**
   * ARS — official 12-digit territory key (state → district → municipality).
   */
  @Expose({ name: 'ars' })
  @IsString()
  regionalKey!: string;

  /**
   * ARS of the federal state the territory belongs to.
   */
  @Expose({ name: 'arsFederalstate' })
  @IsString()
  federalStateKey!: string;

  /**
   * Official name of the location (may include the district in quotes).
   */
  @Expose()
  @IsString()
  name!: string;

  /**
   * Name of the municipality the location belongs to.
   */
  @Expose({ name: 'gemeinde' })
  @IsOptional()
  @IsString()
  municipality?: string;

  /**
   * Postal code of the location's centre.
   */
  @Expose({ name: 'plz' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  /**
   * Street; only present for address-level results.
   */
  @Expose({ name: 'strasse' })
  @IsOptional()
  @IsString()
  street?: string;

  /**
   * [longitude, latitude]; the API mixes number and string encodings.
   */
  @Expose({ name: 'koordinaten' })
  @IsOptional()
  @IsArray()
  coordinates?: [string | number, string | number];
}
