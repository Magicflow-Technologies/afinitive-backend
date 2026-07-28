import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateFirmaDto {
  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  hashFirma?: string;

  @IsOptional()
  datosCertificado?: any;

  @IsOptional()
  coordenadasPagina?: any;
}
