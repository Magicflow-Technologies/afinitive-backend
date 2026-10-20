import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module.js';
import { PrismaModule } from './core/database/prisma/prisma.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { SigningModule } from './modules/signing/signing.module.js';
import { AccessModule } from './modules/access/access.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MailModule } from './core/mail/mail.module.js';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { StorageModule } from './core/storage/storage.module.js';


@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        }
      })
    }),
    ConfigModule,
    PrismaModule,
    IdentityModule,
    OnboardingModule,
    DocumentsModule,
    SigningModule,
    AccessModule,
    AuditModule,
    AuthModule,
    MailModule,
    StorageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
