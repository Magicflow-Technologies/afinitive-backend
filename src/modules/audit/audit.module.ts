import { Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria/auditoria.service.js';
import { AuditoriaController } from './auditoria/auditoria.controller.js';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditModule {}
