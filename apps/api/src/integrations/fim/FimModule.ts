import { Module } from '@nestjs/common';
import { ResilienceModule } from '../common/resilience/ResilienceModule';
import { FimPortalClient } from './FimPortalClient';

@Module({
  imports: [ResilienceModule],
  providers: [FimPortalClient],
  exports: [FimPortalClient],
})
export class FimModule {}
