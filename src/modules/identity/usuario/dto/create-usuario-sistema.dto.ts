import { IsString, IsNotEmpty, IsUUID, MinLength, IsOptional, IsBoolean, IsIn, IsEmail } from 'class-validator';

export class CreateUsuarioSistemaDto {
  @IsIn(['DNI', 'RUC', 'CE', 'PASAPORTE'], { message: 'Tipo de documento no válido.' })
  tipoDocumento!: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio.' })
  numeroDocumento!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios.' })
  nombres!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios.' })
  apellidos!: string;

  @IsEmail({}, { message: 'El correo debe tener un formato válido.' })
  correo!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @IsNotEmpty({ message: 'El cargo es obligatorio.' })
  cargo!: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsUUID('4', { message: 'El rol debe ser un UUID válido.' })
  rolId!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres.' })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  requiere2FA?: boolean;
}
