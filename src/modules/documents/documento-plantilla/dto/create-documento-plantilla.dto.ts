import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateDocumentoPlantillaDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  archivo!: string;

  @IsString()
  formato!: string;

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
