import { Module } from '@nestjs/common';
import { FimPortalClient } from './FimPortalClient';

@Module({
  providers: [FimPortalClient],
  exports: [FimPortalClient],
})
export class FimModule {}
