import { PartialType } from '@nestjs/mapped-types';
import { CreateCampoFormularioDto } from './create-campo-formulario.dto.js';

export class UpdateCampoFormularioDto extends PartialType(CreateCampoFormularioDto) {}
