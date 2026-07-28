import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateAuditoriaDto {
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @IsString()
  accion!: string;

  @IsString()
  entidad!: string;

  @IsString()
  entidadId!: string;

  @IsOptional()
  datosAntes?: any;

  @IsOptional()
  datosDespues?: any;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
