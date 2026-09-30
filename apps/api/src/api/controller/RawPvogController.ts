import type { RawSourceResponse } from '@direktamt/integrations-contracts';
import { Controller, Get, Param } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';

/**
 * Raw provider representations from PVOG: the upstream JSON exactly as
 * delivered, for consumers that need the canonical XZuFi/JZuFi form rather
 * than the normalized model. The set of upstream resources is a static
 * whitelist; callers choose an object id only, never a host, path or
 * header. The body follows the provider's contract and receives no
 * DirektAmt compatibility guarantee.
 */
@Controller('raw/pvog')
export class RawPvogController {
  constructor(private readonly govDataFacade: GovDataFacade) {}

  /**
   * JZuFi 2.3 representation of one service description, as published by PVOG.
   */
  @Get('services/:id/jzufi-2-3')
  getServiceJzufi(@Param('id') id: string): Promise<RawSourceResponse> {
    return this.govDataFacade.getServiceDescriptionJzufi(id);
  }

  /**
   * JZuFi 2.3 representation of one online service, as published by PVOG.
   */
  @Get('online-services/:id/jzufi-2-3')
  getOnlineServiceJzufi(@Param('id') id: string): Promise<RawSourceResponse> {
    return this.govDataFacade.getOnlineServiceJzufi(id);
  }
}
