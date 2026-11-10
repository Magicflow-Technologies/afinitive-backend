import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const clean = value.replace(/,/g, '').trim();
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @IsNotEmpty({ message: 'El monto de inversión es obligatorio' })
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
  tipoValor?: string;

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
  representanteNombre?: string;

  @IsString()
  @IsOptional()
  representanteDni?: string;

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
