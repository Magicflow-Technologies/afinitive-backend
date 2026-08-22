import { IsUUID, IsEmail, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateTokenAccesoDto {
  @IsUUID()
  fichaMadreId!: string;

  @IsEmail()
  emailDestino!: string;

  @IsOptional()
  @IsInt()
  documentosFirmaCantidad?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentosIds?: string[];
}
