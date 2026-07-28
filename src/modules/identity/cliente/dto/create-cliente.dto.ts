import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class CreateClienteDto {
  @IsUUID()
  personaId!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
