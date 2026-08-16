import { Module } from '@nestjs/common';
import { DocumentoPlantillaService } from './documento-plantilla/documento-plantilla.service.js';
import { DocumentoPlantillaController } from './documento-plantilla/documento-plantilla.controller.js';
import { DocumentoGeneralService } from './documento-general/documento-general.service.js';
import { DocumentoGeneralController } from './documento-general/documento-general.controller.js';

@Module({
  controllers: [DocumentoPlantillaController, DocumentoGeneralController],
  providers: [DocumentoPlantillaService, DocumentoGeneralService],
  exports: [DocumentoGeneralService],
})
export class DocumentsModule {}