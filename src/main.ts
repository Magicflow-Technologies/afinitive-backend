import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configServive = app.get(ConfigService);
  const port = configServive.get<number>('app.port', 3001);
  const prefix = configServive.get<string>('app.apiPrefix', 'api/v1');

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    optionsSuccessStatus: 204,
  });
  await app.listen(port, '0.0.0.0');

  logger.log(`Server running on http://localhost:${port}/${prefix}`);
  logger.log(`Environment: ${configServive.get<string>('app.env')}`);
}
bootstrap().catch((error) => {
  console.error('Error durante el arranque del servidor: ', error);
});
