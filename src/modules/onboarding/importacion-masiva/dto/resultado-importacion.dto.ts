export interface ErrorFilaImportacion {
  fila: number;
  documento?: string;
  cliente?: string;
  motivo: string;
}

export interface ExitoFilaImportacion {
  fila: number;
  fichaMadreId: string;
  codigoFicha: string;
  documento: string;
  cliente: string;
}

export class ResultadoImportacionDto {
  totalLeidos: number = 0;
  totalExitosos: number = 0;
  totalFallidos: number = 0;
  exitosos: ExitoFilaImportacion[] = [];
  errores: ErrorFilaImportacion[] = [];
}