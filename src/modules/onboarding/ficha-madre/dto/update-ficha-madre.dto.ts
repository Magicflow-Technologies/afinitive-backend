import { PartialType } from '@nestjs/mapped-types';
import { CreateFichaMadreDto } from './create-ficha-madre.dto.js';

export class UpdateFichaMadreDto extends PartialType(CreateFichaMadreDto) {}
