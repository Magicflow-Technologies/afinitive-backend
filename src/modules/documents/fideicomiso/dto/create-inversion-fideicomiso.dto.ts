import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateInversionFideicomisoDto {
  @IsUUID()
  @IsNotEmpty()
  fichaMadreId: string;

  @IsUUID()
  @IsNotEmpty()
  fideicomisoId: string;

  @IsString()
  @IsOptional()
  moneda?: string;

  @IsNumber()
  @IsNotEmpty()
  monto: number;

  @IsString()
  @IsOptional()
  montoLetras?: string;

  @IsString()
  @IsOptional()
  tasaInteres?: string;

  @IsString()
  @IsOptional()
  plazoEmision?: string;

  @IsString()
  @IsOptional()
  serieEmision?: string;

  @IsString()
  @IsOptional()
  cantidadValores?: string;

  @IsString()
  @IsOptional()
  vigenciaInstruccion?: string;

  @IsString()
  @IsOptional()
  bancoDestino?: string;

  @IsString()
  @IsOptional()
  numeroCuentaDestino?: string;

  @IsString()
  @IsOptional()
  cuentaCciDestino?: string;

  @IsString()
  @IsOptional()
  titularCuentaDestino?: string;

  @IsString()
  @IsOptional()
  vencimiento?: string;

  @IsString()
  @IsOptional()
  correoOpCoril?: string;

  @IsString()
  @IsOptional()
  correoOpCorfid?: string;

  @IsString()
  @IsOptional()
  enlaceCronograma?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
