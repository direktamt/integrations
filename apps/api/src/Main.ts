import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UnsupportedSearchOptionsFilter } from './api/filter/UnsupportedSearchOptionsFilter';
import { UpstreamExceptionFilter } from './api/filter/UpstreamExceptionFilter';
import { AppModule } from './AppModule';
import { CONFIG } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: CONFIG.corsOrigins });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(
    new UpstreamExceptionFilter(),
    new UnsupportedSearchOptionsFilter(),
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle('Direktamt Integrations API')
    .setDescription(
      'Normalized access to official German public-service data from PVOG and FIM.',
    )
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(CONFIG.port);
}

void bootstrap();
