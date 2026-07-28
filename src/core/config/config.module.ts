import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig } from './options/app.config.js';
import { jwtConfig } from './options/jwt.config.js';
import { envSchema } from './env.schema.js';
import { z } from 'zod';
import { databaseConfig } from './options/database.config.js';
import { loggerConfig } from './options/logger.config.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, databaseConfig, loggerConfig],
      validate: (config) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          console.error('Error de validación en variables de entorno:');
          console.error(z.treeifyError(result.error));
          throw new Error('Error de validación en variables de entorno');
        }
        return result.data;
      },
    }),
  ],
})
export class ConfigModule {}
