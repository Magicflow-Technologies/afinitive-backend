import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class CreateMapeoCampoDocumentoDto {
  @IsUUID()
  documentoPlantillaId!: string;

  @IsOptional()
  @IsUUID()
  campoFormularioId?: string;

  @IsString()
  marcador!: string;

  @IsOptional()
  @IsEnum(['FORMULARIO', 'VALOR_FIJO', 'CALCULADO'] as const)
  origen?: 'FORMULARIO' | 'VALOR_FIJO' | 'CALCULADO';

  @IsOptional()
  @IsString()
  valorFijo?: string;

  @IsOptional()
  @IsString()
  expresionCalculo?: string;
}
