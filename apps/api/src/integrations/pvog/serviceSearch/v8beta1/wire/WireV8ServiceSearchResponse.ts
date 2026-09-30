import { Expose, Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { WireV8ServiceSearchPage } from './WireV8ServiceSearchPage';

/**
 * PVOG wire model (v8beta1 service search): top-level envelope of
 * `GET /v8beta1/servicedescriptions`.
 */
export class WireV8ServiceSearchResponse {
  /**
   * Paginated search hits.
   */
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => WireV8ServiceSearchPage)
  serviceDescriptions?: WireV8ServiceSearchPage;

  /**
   * Life-situation aggregation; not consumed, intentionally not validated.
   */
  @Expose()
  facades?: unknown;
}
