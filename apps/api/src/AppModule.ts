import { Module } from '@nestjs/common';
import { ApiModule } from './api/ApiModule';
import { IntegrationsModule } from './integrations/IntegrationsModule';

@Module({
  imports: [IntegrationsModule, ApiModule],
})
export class AppModule {}
