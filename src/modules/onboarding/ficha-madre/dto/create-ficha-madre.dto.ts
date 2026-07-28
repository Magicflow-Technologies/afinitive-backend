import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateFichaMadreDto {
  @IsUUID()
  clienteId!: string;

  @IsUUID()
  empleadoId!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
