import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentoGeneralDto } from './create-documento-general.dto.js';

export class UpdateDocumentoGeneralDto extends PartialType(CreateDocumentoGeneralDto) {}
