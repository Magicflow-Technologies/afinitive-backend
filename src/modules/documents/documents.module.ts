import { Module } from '@nestjs/common';
import { DocumentoPlantillaService } from './documento-plantilla/documento-plantilla.service.js';
import { DocumentoPlantillaController } from './documento-plantilla/documento-plantilla.controller.js';
import { DocumentoGeneralService } from './documento-general/documento-general.service.js';
import { DocumentoGeneralController } from './documento-general/documento-general.controller.js';
import { FideicomisoService } from './fideicomiso/fideicomiso.service.js';
import { FideicomisoController } from './fideicomiso/fideicomiso.controller.js';

@Module({
  controllers: [
    DocumentoPlantillaController,
    DocumentoGeneralController,
    FideicomisoController,
  ],
  providers: [
    DocumentoPlantillaService,
    DocumentoGeneralService,
    FideicomisoService,
  ],
  exports: [DocumentoGeneralService, FideicomisoService],
})
export class DocumentsModule {}
