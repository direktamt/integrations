import { Expose, Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { WireV7ServiceDescriptionPage } from './WireV7ServiceDescriptionPage';

/**
 * PVOG wire model (v7 service search): top-level envelope of
 * `GET /v7/servicedescriptions/{ars}`.
 */
export class WireV7ServiceSearchResponse {
  /**
   * Facet metadata; not consumed yet, intentionally not validated.
   */
  @Expose()
  facades?: unknown;

  /**
   * Life-situation matches; not consumed yet, intentionally not validated.
   */
  @Expose()
  personalMatters?: unknown[];

  /**
   * Paginated service descriptions matching the query.
   */
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => WireV7ServiceDescriptionPage)
  serviceDescriptions?: WireV7ServiceDescriptionPage;
}
