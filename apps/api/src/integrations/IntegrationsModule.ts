import { Module } from '@nestjs/common';
import { FimModule } from './fim/FimModule';
import { GovDataFacade } from './GovDataFacade';
import { PvogModule } from './pvog/PvogModule';
import { ServiceContextAssembler } from './ServiceContextAssembler';

@Module({
  imports: [PvogModule, FimModule],
  providers: [ServiceContextAssembler, GovDataFacade],
  exports: [GovDataFacade],
})
export class IntegrationsModule {}
