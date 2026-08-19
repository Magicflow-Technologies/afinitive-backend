import { Module } from '@nestjs/common';
import { FichaMadreService } from './ficha-madre/ficha-madre.service.js';
import { FichaMadreController } from './ficha-madre/ficha-madre.controller.js';

@Module({
  imports: [],
  controllers: [FichaMadreController],
  providers: [FichaMadreService],
  exports: [FichaMadreService],
})
export class OnboardingModule {}