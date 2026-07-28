import { Module } from '@nestjs/common';
import { ConfigModule } from './core/config/config.module.js';
import { PrismaModule } from './core/database/prisma/prisma.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { SigningModule } from './modules/signing/signing.module.js';
import { AccessModule } from './modules/access/access.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    IdentityModule,
    OnboardingModule,
    DocumentsModule,
    SigningModule,
    AccessModule,
    AuditModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
