import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateFormularioPlantillaDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsInt()
  orden?: number;
}
