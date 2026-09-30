import { Module } from '@nestjs/common';
import { PvogAuthorityClient } from './PvogAuthorityClient';
import { PvogSearchClient } from './PvogSearchClient';

@Module({
  providers: [PvogSearchClient, PvogAuthorityClient],
  exports: [PvogSearchClient, PvogAuthorityClient],
})
export class PvogModule {}
