import { PartialType } from '@nestjs/mapped-types';
import { CreateFichaMadreDto } from './create-ficha-madre.dto.js';
import { IsEnum, IsOptional } from 'class-validator';


export enum EstadoFichaMadre {
    PENDIENTE = 'PENDIENTE',
    EN_PROCESO = 'EN_PROCESO',
    EN_REVISION = 'EN_REVISION',
    RECHAZADA = 'RECHAZADA',
    APROBADA = 'APROBADA',
}
export class UpdateFichaMadreDto extends PartialType(CreateFichaMadreDto) {

    @IsOptional()
    @IsEnum(EstadoFichaMadre)
    estado?: EstadoFichaMadre;
}
