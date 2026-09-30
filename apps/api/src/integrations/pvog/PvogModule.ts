import { Module } from '@nestjs/common';
import { PvogAuthorityClient } from './PvogAuthorityClient';
import { PvogRawClient } from './PvogRawClient';
import { PvogSearchClient } from './PvogSearchClient';

@Module({
  providers: [PvogSearchClient, PvogAuthorityClient, PvogRawClient],
  exports: [PvogSearchClient, PvogAuthorityClient, PvogRawClient],
})
export class PvogModule {}
