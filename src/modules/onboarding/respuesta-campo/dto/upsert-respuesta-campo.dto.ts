import { IsString, IsUUID } from 'class-validator';

export class UpsertRespuestaCampoDto {
  @IsUUID()
  fichaFormularioId!: string;

  @IsUUID()
  campoFormularioId!: string;

  @IsString()
  valor!: string;
}
