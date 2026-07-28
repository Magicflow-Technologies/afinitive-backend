import { IsOptional, IsEnum } from 'class-validator';

export class UpdateFichaFormularioDto {
  @IsOptional()
  @IsEnum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'RECHAZADO'] as const)
  estado?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO';
}
