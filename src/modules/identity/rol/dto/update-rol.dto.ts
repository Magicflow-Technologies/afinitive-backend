import { PartialType } from '@nestjs/mapped-types';
import { CreateRolDto } from './create-rol.dto.js';

export class UpdateRolDto extends PartialType(CreateRolDto) {}
