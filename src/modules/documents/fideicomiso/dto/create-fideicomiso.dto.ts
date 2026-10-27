import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateFideicomisoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  fideicomitente?: string;

  @IsString()
  @IsOptional()
  emisorFiduciario?: string;

  @IsString()
  @IsOptional()
  patrimonioNombreLargo?: string;

  @IsString()
  @IsOptional()
  denominacionValores?: string;

  @IsString()
  @IsOptional()
  tipoValor?: string;

  @IsString()
  @IsOptional()
  monedaDefault?: string;

  @IsString()
  @IsOptional()
  tasaInteresDefault?: string;

  @IsString()
  @IsOptional()
  plazoEmisionDefault?: string;

  @IsString()
  @IsOptional()
  notario?: string;

  @IsString()
  @IsOptional()
  bancoNombre?: string;

  @IsString()
  @IsOptional()
  numeroCuenta?: string;

  @IsString()
  @IsOptional()
  cuentaCci?: string;

  @IsString()
  @IsOptional()
  titularCuenta?: string;

  @IsString()
  @IsOptional()
  ruc?: string;

  @IsString()
  @IsOptional()
  direccionFiduciario?: string;

  @IsString()
  @IsOptional()
  representanteLegal?: string;

  @IsString()
  @IsOptional()
  correoOpCorilDefault?: string;

  @IsString()
  @IsOptional()
  correoOpCorfidDefault?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
