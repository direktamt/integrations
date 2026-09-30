import { Module } from '@nestjs/common';
import { FimModule } from './fim/FimModule';
import { GovDataFacade } from './GovDataFacade';
import { PvogModule } from './pvog/PvogModule';

@Module({
  imports: [PvogModule, FimModule],
  providers: [GovDataFacade],
  exports: [GovDataFacade],
})
export class IntegrationsModule {}
