import { Module } from '@nestjs/common';
import { FichaMadreService } from './ficha-madre/ficha-madre.service.js';
import { FichaMadreController } from './ficha-madre/ficha-madre.controller.js';
import { ImportacionMasivaModule } from './importacion-masiva/importacion-masiva.module.js';


@Module({
  imports: [ImportacionMasivaModule],
  controllers: [FichaMadreController],
  providers: [FichaMadreService],
  exports: [FichaMadreService],
})
export class OnboardingModule {}