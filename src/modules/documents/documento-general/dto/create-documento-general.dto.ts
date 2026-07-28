import { IsString, IsUUID, IsOptional, IsInt, IsEnum } from 'class-validator';

export class CreateDocumentoGeneralDto {
  @IsUUID()
  fichaMadreId!: string;

  @IsUUID()
  documentoPlantillaId!: string;

  @IsString()
  nombreArchivo!: string;

  @IsString()
  rutaArchivo!: string;

  @IsOptional()
  @IsString()
  hashIntegridad?: string;

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsEnum(['PENDIENTE', 'GENERADO', 'PENDIENTE_FIRMA', 'PARCIAL_FIRMADO', 'FIRMADO', 'ANULADO'] as const)
  estado?: 'PENDIENTE' | 'GENERADO' | 'PENDIENTE_FIRMA' | 'PARCIAL_FIRMADO' | 'FIRMADO' | 'ANULADO';
}
