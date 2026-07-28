import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const configServive = app.get(ConfigService);
  const port = configServive.get<number>('app.port', 3001);
  const prefix = configServive.get<string>('app.apiPrefix', 'api/v1');

  app.setGlobalPrefix(prefix);
  await app.listen(port);

  logger.log(`Server running on http://localhost:${port}/${prefix}`);
  logger.log(`Environment: ${configServive.get<string>('app.env')}`);
}
bootstrap().catch((error) => {
  console.error('Error durante el arranque del servidor: ', error);
});
