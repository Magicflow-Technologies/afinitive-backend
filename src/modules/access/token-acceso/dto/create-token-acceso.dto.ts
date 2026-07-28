import { IsUUID, IsString, IsEmail } from 'class-validator';

export class CreateTokenAccesoDto {
  @IsUUID()
  fichaMadreId!: string;

  @IsEmail()
  emailDestino!: string;
}
