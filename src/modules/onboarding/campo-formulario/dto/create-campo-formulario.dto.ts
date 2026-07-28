import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsJSON } from 'class-validator';

export class CreateCampoFormularioDto {
  @IsString()
  formularioPlantillaId!: string;

  @IsString()
  nombre!: string;

  @IsString()
  etiqueta!: string;

  @IsOptional()
  @IsEnum(['TEXTO', 'NUMERO', 'FECHA', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'TEXTAREA', 'EMAIL', 'TELEFONO', 'MONEDA'] as const)
  tipo?: 'TEXTO' | 'NUMERO' | 'FECHA' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'TEXTAREA' | 'EMAIL' | 'TELEFONO' | 'MONEDA';

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsString()
  valorPorDefecto?: string;

  @IsOptional()
  @IsString()
  patronValidacion?: string;

  @IsOptional()
  @IsInt()
  minLength?: number;

  @IsOptional()
  @IsInt()
  maxLength?: number;

  @IsOptional()
  opciones?: any;
}
