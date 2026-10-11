import { IsString, IsNotEmpty, IsUUID, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateUsuarioClienteDto {
  @IsUUID('4', { message: 'El ID de cliente debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID de cliente es obligatorio.' })
  clienteId!: string;

  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres.' })
  username!: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  requiere2FA?: boolean;
}
