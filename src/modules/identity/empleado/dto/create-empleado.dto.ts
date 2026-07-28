import { IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateEmpleadoDto {
  @IsUUID()
  personaId!: string;

  @IsString()
  cargo!: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
