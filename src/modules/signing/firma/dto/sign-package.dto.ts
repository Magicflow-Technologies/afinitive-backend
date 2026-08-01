import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SignPackageDto {
  @IsString()
  firmanteNombre!: string;

  @IsString()
  firmanteDocumento!: string;

  @IsString()
  firmanteEmail!: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  firmaImagen?: string;

  @IsBoolean()
  aceptaTerminos!: boolean;
}
