import { Expose, Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { WireServiceDescriptionPage } from './WireServiceDescriptionPage';

/**
 * PVOG wire model: top-level envelope of the service search endpoint.
 */
export class WireServiceSearchResponse {
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
  @Type(() => WireServiceDescriptionPage)
  serviceDescriptions?: WireServiceDescriptionPage;
}
