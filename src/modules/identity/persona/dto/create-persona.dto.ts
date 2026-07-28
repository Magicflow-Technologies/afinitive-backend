import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreatePersonaDto {
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
}
