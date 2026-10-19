import { normalizeHeaderKey } from './excel-parser.helper.js';

/**
 * Mapeo oficial entre las columnas del Excel del cliente y las claves de nuestro modelo interno.
 * Cada clave representa la versión normalizada (sin tildes, minúsculas, sin asteriscos).
 */
export const COLUMNAS_EXCEL_MAP: Record<string, string> = {
  // 1. Titular - Identificación
  [normalizeHeaderKey('Nombres y Apellidos *')]: 'nombresApellidos',
  [normalizeHeaderKey('Tipo Documento *')]: 'tipoDocumento',
  [normalizeHeaderKey('Número Documento *')]: 'numeroDocumento',
  [normalizeHeaderKey('Nacionalidad *')]: 'nacionalidad',
  [normalizeHeaderKey('Sexo *')]: 'sexo',
  [normalizeHeaderKey('País Nacimiento *')]: 'paisNacimiento',
  [normalizeHeaderKey('Departamento Nacimiento')]: 'departamentoNacimiento',
  [normalizeHeaderKey('Fecha Nacimiento *')]: 'fechaNacimiento',
  [normalizeHeaderKey('País Residencia *')]: 'paisResidencia',
  [normalizeHeaderKey('Grado Instrucción *')]: 'gradoInstruccion',
  [normalizeHeaderKey('Estado Civil *')]: 'estadoCivil',
  [normalizeHeaderKey('Correo Electrónico *')]: 'correoElectronico',
  [normalizeHeaderKey('Teléfono Celular *')]: 'telefonoCelular',
  [normalizeHeaderKey('¿Es Titular Inversión? *')]: 'esTitularInversion',
  [normalizeHeaderKey('¿Es / Fue PEP? *')]: 'esPep',

  // 2. Cónyuge
  [normalizeHeaderKey('Cónyuge Nombres Apellidos *')]: 'conyugeNombresApellidos',
  [normalizeHeaderKey('Cónyuge Tipo Doc *')]: 'conyugeTipoDoc',
  [normalizeHeaderKey('Cónyuge Num Doc *')]: 'conyugeNumDoc',
  [normalizeHeaderKey('Régimen Patrimonial *')]: 'regimenPatrimonial',
  [normalizeHeaderKey('Fecha del Régimen')]: 'fechaRegimen',

  // 3. Domicilio
  [normalizeHeaderKey('¿Domiciliado País? *')]: 'esDomiciliado',
  [normalizeHeaderKey('Dirección Completa *')]: 'direccionCompleta',
  [normalizeHeaderKey('Departamento *')]: 'departamento',
  [normalizeHeaderKey('Provincia *')]: 'provincia',
  [normalizeHeaderKey('Distrito *')]: 'distrito',
  [normalizeHeaderKey('País *')]: 'pais',
  [normalizeHeaderKey('Código Postal')]: 'codigoPostal',
  [normalizeHeaderKey('¿Correspondencia = Domicilio? *')]: 'usarMismaDireccionCorrespondencia',

  // 4. Laboral y Vinculaciones
  [normalizeHeaderKey('Situación Laboral *')]: 'situacionLaboral',
  [normalizeHeaderKey('Profesión *')]: 'profesion',
  [normalizeHeaderKey('Ocupación *')]: 'ocupacion',
  [normalizeHeaderKey('Empresa / Centro Trabajo *')]: 'empresaCentroTrabajo',
  [normalizeHeaderKey('Ingreso Promedio Anual (USD) *')]: 'ingresoPromedioAnual',
  [normalizeHeaderKey('¿Vinculado CORFID/Grupo Coril? *')]: 'esVinculadoCorfid',
  [normalizeHeaderKey('¿Cliente Otra Fiduciaria? *')]: 'clienteOtraFiduciaria',
  [normalizeHeaderKey('¿Trabajador Otra Fiduciaria? *')]: 'trabajadorOtraFiduciaria',
  [normalizeHeaderKey('Valor Aprox. Patrimonio (USD) *')]: 'valorAproxPatrimonio',

  // 5. Origen de Fondos
  [normalizeHeaderKey('Fondos Propios')]: 'fondosPropios',
  [normalizeHeaderKey('Venta de Activos')]: 'ventaActivos',
  [normalizeHeaderKey('Financiamientos')]: 'financiamientos',
  [normalizeHeaderKey('Dividendos y Participaciones')]: 'dividendosParticipaciones',
  [normalizeHeaderKey('Contrato Obra / Licitación')]: 'contratoObraLicitacion',
  [normalizeHeaderKey('Patrimonio Fideicometido')]: 'patrimonioFideicometido',
  [normalizeHeaderKey('Otros Fondos (Detalle)')]: 'otrosFondosDetalle',

  // 6. Apoderado
  [normalizeHeaderKey('¿Actúa por Apoderado? *')]: 'tieneApoderado',
  [normalizeHeaderKey('Apoderado Nombres Apellidos')]: 'apoderadoNombresApellidos',
  [normalizeHeaderKey('Apoderado Tipo Doc')]: 'apoderadoTipoDoc',
  [normalizeHeaderKey('Apoderado Num Doc')]: 'apoderadoNumDoc',
  [normalizeHeaderKey('Apoderado Nacionalidad')]: 'apoderadoNacionalidad',
  [normalizeHeaderKey('Apoderado Sexo')]: 'apoderadoSexo',
  [normalizeHeaderKey('Apoderado Estado Civil')]: 'apoderadoEstadoCivil',
  [normalizeHeaderKey('Apoderado País Nacimiento')]: 'apoderadoPaisNacimiento',
  [normalizeHeaderKey('Apoderado Fecha Nacimiento')]: 'apoderadoFechaNacimiento',
  [normalizeHeaderKey('Apoderado País Residencia')]: 'apoderadoPaisResidencia',
  [normalizeHeaderKey('Apoderado Grado Instrucción')]: 'apoderadoGradoInstruccion',
  [normalizeHeaderKey('Apoderado Correo')]: 'apoderadoCorreo',
  [normalizeHeaderKey('Apoderado Celular')]: 'apoderadoCelular',
  [normalizeHeaderKey('Apoderado ¿Domiciliado?')]: 'apoderadoEsDomiciliado',
  [normalizeHeaderKey('Apoderado Dirección')]: 'apoderadoDireccion',
  [normalizeHeaderKey('Apoderado Departamento')]: 'apoderadoDepartamento',
  [normalizeHeaderKey('Apoderado Provincia')]: 'apoderadoProvincia',
  [normalizeHeaderKey('Apoderado Distrito')]: 'apoderadoDistrito',
  [normalizeHeaderKey('Apoderado País')]: 'apoderadoPais',
  [normalizeHeaderKey('Apoderado Código Postal')]: 'apoderadoCodigoPostal',
  [normalizeHeaderKey('Partida Registral')]: 'partidaRegistral',
  [normalizeHeaderKey('Asiento')]: 'asiento',
  [normalizeHeaderKey('Zona Registral')]: 'zonaRegistral',

  // 7. Antecedentes Penales
  [normalizeHeaderKey('¿Investigado/Condenado Delitos? *')]: 'esInvestigadoDelitos',
  [normalizeHeaderKey('Detalle Delitos / Investigaciones')]: 'detalleDelitos',

  // 8. Residencia Fiscal
  [normalizeHeaderKey('¿Tributa Fuera de Perú? *')]: 'tributaFueraPeru',
  [normalizeHeaderKey('País Residencia Fiscal')]: 'paisResidenciaFiscal',
  [normalizeHeaderKey('NIT / TIN')]: 'nitTin',

  // 9. Inversión y Bancos
  [normalizeHeaderKey('Moneda *')]: 'moneda',
  [normalizeHeaderKey('Monto Inicial Invertir *')]: 'montoInicialInvertir',
  [normalizeHeaderKey('Monto en Letras')]: 'montoEnLetras',
  [normalizeHeaderKey('Origen de los Recursos *')]: 'origenRecursos',
  [normalizeHeaderKey('Banco *')]: 'bancoNombre',
  [normalizeHeaderKey('Número de Cuenta / Tarjeta')]: 'numeroCuenta',
  [normalizeHeaderKey('Código Cuenta Interbancario (CCI) *')]: 'cuentaCci',

  // 10. Métricas del Inversionista
  [normalizeHeaderKey('Total Operaciones')]: 'totalOperaciones',
  [normalizeHeaderKey('Monto Total USD')]: 'montoTotalUsd',
  [normalizeHeaderKey('Monto Total PEN')]: 'montoTotalPen',
  [normalizeHeaderKey('Tasa Promedio %')]: 'tasaPromedio',
  [normalizeHeaderKey('Vehículos / Emisores')]: 'vehiculosEmisores',
};

/**
 * Convierte una fila indexada por número de columna a un objeto tipado
 * usando las cabeceras detectadas en la fila 1.
 */
export function mapRowToObject(
  rowValues: unknown[],
  headerMap: Map<number, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  headerMap.forEach((propKey, colIndex) => {
    result[propKey] = rowValues[colIndex];
  });

  return result;
}