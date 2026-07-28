import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateUsuarioDto {
  @IsUUID()
  personaId!: string;

  @IsUUID()
  rolId!: string;

  @IsString()
  username!: string;

  @IsString()
  passwordHash!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
