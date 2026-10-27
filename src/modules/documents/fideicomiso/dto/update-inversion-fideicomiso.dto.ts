import { PartialType } from '@nestjs/mapped-types';
import { CreateInversionFideicomisoDto } from './create-inversion-fideicomiso.dto.js';

export class UpdateInversionFideicomisoDto extends PartialType(CreateInversionFideicomisoDto) {}
