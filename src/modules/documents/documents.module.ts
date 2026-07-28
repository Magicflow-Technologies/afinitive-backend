import { Module } from '@nestjs/common';
import { DocumentoPlantillaService } from './documento-plantilla/documento-plantilla.service.js';
import { DocumentoPlantillaController } from './documento-plantilla/documento-plantilla.controller.js';
import { MapeoCampoDocumentoService } from './mapeo-campo-documento/mapeo-campo-documento.service.js';
import { MapeoCampoDocumentoController } from './mapeo-campo-documento/mapeo-campo-documento.controller.js';
import { DocumentoGeneralService } from './documento-general/documento-general.service.js';
import { DocumentoGeneralController } from './documento-general/documento-general.controller.js';

@Module({
  controllers: [DocumentoPlantillaController, MapeoCampoDocumentoController, DocumentoGeneralController],
  providers: [DocumentoPlantillaService, MapeoCampoDocumentoService, DocumentoGeneralService],
  exports: [DocumentoGeneralService],
})
export class DocumentsModule {}
