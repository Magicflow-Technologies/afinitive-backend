import { Module } from '@nestjs/common';
import { FirmaService } from './firma/firma.service.js';
import { FirmaController } from './firma/firma.controller.js';

@Module({
  controllers: [FirmaController],
  providers: [FirmaService],
  exports: [FirmaService],
})
export class SigningModule {}
