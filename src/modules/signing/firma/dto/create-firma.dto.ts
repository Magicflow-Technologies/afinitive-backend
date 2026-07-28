import { IsUUID, IsOptional, IsEnum, IsString, IsObject } from 'class-validator';

export class CreateFirmaDto {
  @IsUUID()
  documentoGeneralId!: string;

  @IsOptional()
  @IsEnum(['SIMPLE', 'ELECTRONICA', 'AVANZADA'] as const)
  tipo?: 'SIMPLE' | 'ELECTRONICA' | 'AVANZADA';

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  firmanteNombre?: string;

  @IsOptional()
  @IsString()
  firmanteDocumento?: string;

  @IsOptional()
  @IsString()
  firmanteEmail?: string;
}
