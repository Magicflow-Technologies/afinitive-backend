import { PartialType } from '@nestjs/mapped-types';
import { CreateFormularioPlantillaDto } from './create-formulario-plantilla.dto.js';

export class UpdateFormularioPlantillaDto extends PartialType(CreateFormularioPlantillaDto) {}
