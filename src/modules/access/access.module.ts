import { Module } from '@nestjs/common';
import { TokenAccesoService } from './token-acceso/token-acceso.service.js';
import { TokenAccesoController } from './token-acceso/token-acceso.controller.js';

@Module({
  controllers: [TokenAccesoController],
  providers: [TokenAccesoService],
  exports: [TokenAccesoService],
})
export class AccessModule {}
