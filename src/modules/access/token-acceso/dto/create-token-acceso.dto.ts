import { IsUUID, IsEmail, IsOptional, IsIn, IsInt } from 'class-validator';

export class CreateTokenAccesoDto {
  @IsUUID()
  fichaMadreId!: string;

  @IsEmail()
  emailDestino!: string;

  @IsOptional()
  @IsInt()
  @IsIn([2, 5, 7])
  documentosFirmaCantidad?: number;
}
