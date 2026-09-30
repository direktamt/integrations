import { Module } from '@nestjs/common';
import { PvogSearchClient } from './PvogSearchClient';

@Module({
  providers: [PvogSearchClient],
  exports: [PvogSearchClient],
})
export class PvogModule {}
