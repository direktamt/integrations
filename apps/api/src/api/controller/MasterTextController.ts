import type { ParsedMasterText } from '@direktamt/integrations-contracts';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { GovDataFacade } from '../../integrations/GovDataFacade';
import { GetMasterTextQuery } from '../request/GetMasterTextQuery';

/**
 * Federal master texts (parsed XZuFi) — the fallback service description
 * when no local one exists. Keyed by editorial office + service, not by
 * service catalog key, hence a resource of its own.
 */
@Controller('master-texts')
export class MasterTextController {
  constructor(private readonly govDataFacade: GovDataFacade) {}

  @Get(':editorialOfficeId/:serviceId')
  get(
    @Param('editorialOfficeId') editorialOfficeId: string,
    @Param('serviceId') serviceId: string,
    @Query() query: GetMasterTextQuery,
  ): Promise<ParsedMasterText> {
    return this.govDataFacade.getParsedMasterText(
      editorialOfficeId,
      serviceId,
      query.source,
    );
  }
}
