import { PartialType } from '@nestjs/mapped-types';
import { CreateMapeoCampoDocumentoDto } from './create-mapeo-campo-documento.dto.js';

export class UpdateMapeoCampoDocumentoDto extends PartialType(CreateMapeoCampoDocumentoDto) {}
