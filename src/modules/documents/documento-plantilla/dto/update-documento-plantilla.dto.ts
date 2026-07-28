import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentoPlantillaDto } from './create-documento-plantilla.dto.js';

export class UpdateDocumentoPlantillaDto extends PartialType(CreateDocumentoPlantillaDto) {}
