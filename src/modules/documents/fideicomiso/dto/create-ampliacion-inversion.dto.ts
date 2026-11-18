import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class CreateAmpliacionInversionDto {
  @IsNumber()
  @IsPositive()
  montoAmpliacion: number;

  @IsOptional()
  @IsString()
  montoAmpliacionLetras?: string;

  @IsOptional()
  @IsString()
  montoNuevoTotalLetras?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
