import { IsString, IsOptional } from 'class-validator';

export class CreateRolDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
