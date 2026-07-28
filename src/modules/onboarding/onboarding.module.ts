import { Module } from '@nestjs/common';
import { FichaMadreService } from './ficha-madre/ficha-madre.service.js';
import { FichaMadreController } from './ficha-madre/ficha-madre.controller.js';
import { FormularioPlantillaService } from './formulario-plantilla/formulario-plantilla.service.js';
import { FormularioPlantillaController } from './formulario-plantilla/formulario-plantilla.controller.js';
import { CampoFormularioService } from './campo-formulario/campo-formulario.service.js';
import { CampoFormularioController } from './campo-formulario/campo-formulario.controller.js';
import { FichaFormularioService } from './ficha-formulario/ficha-formulario.service.js';
import { FichaFormularioController } from './ficha-formulario/ficha-formulario.controller.js';
import { RespuestaCampoService } from './respuesta-campo/respuesta-campo.service.js';
import { RespuestaCampoController } from './respuesta-campo/respuesta-campo.controller.js';

@Module({
  controllers: [
    FichaMadreController,
    FormularioPlantillaController,
    CampoFormularioController,
    FichaFormularioController,
    RespuestaCampoController,
  ],
  providers: [
    FichaMadreService,
    FormularioPlantillaService,
    CampoFormularioService,
    FichaFormularioService,
    RespuestaCampoService,
  ],
  exports: [FichaMadreService, FichaFormularioService],
})
export class OnboardingModule {}
