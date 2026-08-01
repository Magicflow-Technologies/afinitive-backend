import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFichaInicialDto {
  @IsEnum(['DNI', 'RUC', 'CE', 'PASAPORTE'] as const)
  tipoDocumento!: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';

  @IsString()
  numeroDocumento!: string;

  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsEmail()
  correo!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsUUID()
  empleadoId!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
