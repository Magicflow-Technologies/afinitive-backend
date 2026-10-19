import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { TipoDocumento } from '../../../generated/prisma/index.js';
import {
  ResultadoImportacionDto,
  ErrorFilaImportacion,
  ExitoFilaImportacion,
} from './dto/resultado-importacion.dto.js';
import {
  COLUMNAS_EXCEL_MAP,
  mapRowToObject,
} from './helpers/excel-columnas.js';
import {
  extractCellValue,
  normalizeHeaderKey,
  parseBoolean,
  parseDate,
  parseNumber,
  parseString,
} from './helpers/excel-parser.helper.js';

@Injectable()
export class ImportacionMasivaService {
  private readonly logger = new Logger(ImportacionMasivaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el siguiente correlativo oficial FM-YYYY-XXXXXX buscando el máximo existente
   */
  private async generateCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FM-${year}-`;
    const fichas = await this.prisma.fichaMadre.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    });

    let max = 0;
    const regex = new RegExp(`^FM-(\\d{4})-(\\d+)$`);
    for (const ficha of fichas) {
      const match = ficha.codigo.match(regex);
      if (match && Number(match[1]) === year) {
        max = Math.max(max, Number(match[2]));
      }
    }

    return `${prefix}${String(max + 1).padStart(6, '0')}`;
  }

  /**
   * Normaliza el tipo de documento hacia el enum oficial de Prisma
   */
  private normalizarTipoDoc(val?: string): TipoDocumento {
    if (!val) return 'DNI';
    const up = val.trim().toUpperCase();
    if (['DNI', 'RUC', 'CE', 'PASAPORTE'].includes(up)) {
      return up as TipoDocumento;
    }
    return 'DNI';
  }

  /**
   * Procesa el archivo Excel cargado en memoria fila por fila
   */
  async procesarArchivoExcel(
    fileBuffer: Buffer,
    empleadoIdFallback?: string,
  ): Promise<ResultadoImportacionDto> {
    const resultado = new ResultadoImportacionDto();

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch (err: any) {
      this.logger.error('Error al cargar el archivo con ExcelJS:', err);
      throw new BadRequestException('El archivo no es un documento Excel válido (.xlsx)');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new BadRequestException('El archivo Excel está vacío o no contiene filas de datos');
    }

    // 1. Resolver estrictamente el empleado logueado que realiza la carga
    if (!empleadoIdFallback) {
      throw new BadRequestException(
        'No se envió la identificación del asesor/empleado responsable. Por favor inicia sesión nuevamente.',
      );
    }

    // Buscar si el ID enviado corresponde a empleado.id o a su personaId
    let empleadoValido = await this.prisma.empleado.findFirst({
      where: {
        OR: [
          { id: empleadoIdFallback },
          { personaId: empleadoIdFallback },
        ],
        activo: true,
      },
      select: { id: true, persona: { select: { nombres: true, apellidos: true } } },
    });

    // Si no se encontró directamente en empleado, buscar si fue enviado como usuario.id o personaId
    if (!empleadoValido) {
      const usuario = await this.prisma.usuario.findFirst({
        where: {
          OR: [
            { id: empleadoIdFallback },
            { personaId: empleadoIdFallback },
          ],
        },
        include: { persona: { include: { empleado: true } }, rol: true },
      });

      if (usuario) {
        if (usuario.persona.empleado) {
          empleadoValido = {
            id: usuario.persona.empleado.id,
            persona: { nombres: usuario.persona.nombres, apellidos: usuario.persona.apellidos },
          };
        } else if (usuario.rol.nombre.toLowerCase() !== 'cliente') {
          // Auto-provisionar registro de empleado para este usuario interno
          const nuevoEmpleado = await this.prisma.empleado.create({
            data: {
              personaId: usuario.persona.id,
              cargo: usuario.rol.nombre.toLowerCase() === 'analista' ? 'Analista de Inversiones' : usuario.rol.nombre.toLowerCase() === 'admin' ? 'Administrador' : 'Operador de Onboarding',
              area: 'Operaciones',
              activo: true,
            },
            select: { id: true },
          });
          empleadoValido = {
            id: nuevoEmpleado.id,
            persona: { nombres: usuario.persona.nombres, apellidos: usuario.persona.apellidos },
          };
        }
      }
    }

    if (!empleadoValido) {
      throw new BadRequestException(
        'El usuario actual no tiene un perfil de Empleado/Asesor activo asociado para ser responsable de estos expedientes.',
      );
    }

    const empleadoId = empleadoValido.id;
    this.logger.log(`Expedientes asignados estrictamente al asesor: ${empleadoValido.persona?.nombres} ${empleadoValido.persona?.apellidos} (ID: ${empleadoId})`);

    // 2. Mapear cabeceras en la Fila 1
    const headerRow = worksheet.getRow(1);
    const headerMap = new Map<number, string>();

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const cellText = extractCellValue(cell.value);
      if (cellText) {
        const normalized = normalizeHeaderKey(String(cellText));
        const internalKey = COLUMNAS_EXCEL_MAP[normalized];
        if (internalKey) {
          headerMap.set(colNumber, internalKey);
        }
      }
    });

    if (headerMap.size === 0) {
      throw new BadRequestException(
        'No se identificaron columnas válidas en la fila 1. Verifica los títulos de los campos.',
      );
    }

    this.logger.log(`Columnas detectadas en la plantilla Excel: ${headerMap.size}`);

    // 3. Iterar datos a partir de la Fila 2
    const totalFilas = worksheet.rowCount;

    for (let rowNumber = 2; rowNumber <= totalFilas; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      if (!row || !row.hasValues) continue;

      const rowValues: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowValues[colNumber] = extractCellValue(cell.value);
      });

      const rowData = mapRowToObject(rowValues, headerMap);

      // Descartar filas vacías
      const tieneDatos = Object.values(rowData).some(
        (v) => v !== null && v !== undefined && String(v).trim() !== '',
      );
      if (!tieneDatos) continue;

      resultado.totalLeidos++;

      try {
        const exito = await this.procesarFila(rowData, rowNumber, empleadoId!);
        resultado.totalExitosos++;
        resultado.exitosos.push(exito);
      } catch (err: any) {
        resultado.totalFallidos++;
        const errorInfo: ErrorFilaImportacion = {
          fila: rowNumber,
          documento: parseString(rowData.numeroDocumento),
          cliente: parseString(rowData.nombresApellidos),
          motivo: err?.message || 'Error inesperado al guardar la fila',
        };
        resultado.errores.push(errorInfo);
        this.logger.warn(`Fila ${rowNumber} falló: ${errorInfo.motivo}`);
      }
    }

    this.logger.log(
      `Importación finalizada. Total leídos: ${resultado.totalLeidos}, Exitosos: ${resultado.totalExitosos}, Fallidos: ${resultado.totalFallidos}`,
    );

    return resultado;
  }

  /**
   * Persiste una fila individual en una transacción atómica por cliente
   */
  private async procesarFila(
    data: Record<string, unknown>,
    filaIndex: number,
    empleadoId: string,
  ): Promise<ExitoFilaImportacion> {
    const nombresApellidos = parseString(data.nombresApellidos);
    const numeroDoc = parseString(data.numeroDocumento);
    const tipoDoc = this.normalizarTipoDoc(parseString(data.tipoDocumento));

    if (!numeroDoc) {
      throw new Error(`El 'Número Documento' es obligatorio (Fila ${filaIndex})`);
    }

    if (!nombresApellidos) {
      throw new Error(`'Nombres y Apellidos' es obligatorio (Fila ${filaIndex})`);
    }

    // Dividir nombres y apellidos si vienen en una sola cadena
    const partesNombre = nombresApellidos.split(' ').filter(Boolean);
    const nombres = partesNombre.length > 1 ? partesNombre.slice(0, -1).join(' ') : nombresApellidos;
    const apellidos = partesNombre.length > 1 ? partesNombre.slice(-1).join(' ') : ' ';

    const correo = parseString(data.correoElectronico) || `${numeroDoc.toLowerCase()}@importado.afinitive.pe`;
    const celular = parseString(data.telefonoCelular);
    const direccionDomicilio = parseString(data.direccionCompleta) || 'Sin dirección';

    return await this.prisma.$transaction(async (tx) => {
      // 1. Persona
      const persona = await tx.persona.upsert({
        where: {
          uk_persona_documento: {
            tipoDocumento: tipoDoc,
            numeroDocumento: numeroDoc,
          },
        },
        create: {
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          nombres,
          apellidos,
          correo,
          telefono: celular,
          direccion: direccionDomicilio,
        },
        update: {
          nombres,
          apellidos,
          correo: parseString(data.correoElectronico) || undefined,
          telefono: celular || undefined,
          direccion: direccionDomicilio || undefined,
        },
      });

      // 2. Cliente
      let cliente = await tx.cliente.findUnique({
        where: { personaId: persona.id },
      });

      if (!cliente) {
        cliente = await tx.cliente.create({
          data: { personaId: persona.id },
        });
      }

      // 3. Ficha Madre (con reintento si hubiera concurrencia de correlativo)
      let ficha = await tx.fichaMadre.findUnique({
        where: { clienteId: cliente.id },
      });

      if (!ficha) {
        const maxIntentos = 5;
        for (let intento = 1; intento <= maxIntentos; intento++) {
          const codigo = await this.generateCodigo();
          try {
            ficha = await tx.fichaMadre.create({
              data: {
                codigo,
                clienteId: cliente.id,
                empleadoId,
                estado: 'PENDIENTE',
                observaciones: JSON.stringify({
                  totalOperaciones: parseNumber(data.totalOperaciones),
                  montoTotalUsd: parseNumber(data.montoTotalUsd),
                  montoTotalPen: parseNumber(data.montoTotalPen),
                  tasaPromedio: parseNumber(data.tasaPromedio),
                  vehiculosEmisores: parseString(data.vehiculosEmisores),
                }),
              },
            });
            break;
          } catch (err: any) {
            if (err?.code === 'P2002' && intento < maxIntentos) {
              continue;
            }
            throw err;
          }
        }
      }

      if (!ficha) {
        throw new Error(`No se pudo generar un código único de Ficha Madre para el cliente (Fila ${filaIndex})`);
      }

      // 4. Inversionista
      const esDomiciliado = parseBoolean(data.esDomiciliado, true);
      const mismaDirCorrespondencia = parseBoolean(data.usarMismaDireccionCorrespondencia, true);
      const tieneApoderado = parseBoolean(data.tieneApoderado, false);

      const inversionista = await tx.inversionista.upsert({
        where: { fichaMadreId: ficha.id },
        create: {
          fichaMadreId: ficha.id,
          esDomiciliado,
          usarMismaDireccionCorrespondencia: mismaDirCorrespondencia,
          tieneApoderado,
        },
        update: {
          esDomiciliado,
          usarMismaDireccionCorrespondencia: mismaDirCorrespondencia,
          tieneApoderado,
        },
      });

      // 5. Titular
      await tx.titular.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          nombresApellidos,
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          nacionalidad: parseString(data.nacionalidad) || 'Peruana',
          sexo: parseString(data.sexo),
          paisNacimiento: parseString(data.paisNacimiento) || 'Perú',
          departamentoNacimiento: parseString(data.departamentoNacimiento),
          fechaNacimiento: parseDate(data.fechaNacimiento),
          paisResidencia: parseString(data.paisResidencia) || 'Perú',
          gradoInstruccion: parseString(data.gradoInstruccion),
          estadoCivil: parseString(data.estadoCivil) || 'SOLTERO',
          esInversionista: parseBoolean(data.esTitularInversion, true),
          correoElectronico: correo,
          telefonoCelular: celular,
          conyugeNombresApellidos: parseString(data.conyugeNombresApellidos),
          conyugeTipoDocumento: data.conyugeTipoDoc ? this.normalizarTipoDoc(parseString(data.conyugeTipoDoc)) : undefined,
          conyugeNumeroDocumento: parseString(data.conyugeNumDoc),
          regimenPatrimonial: parseString(data.regimenPatrimonial),
          fechaRegimen: parseDate(data.fechaRegimen),
          pep: parseBoolean(data.esPep, false),
        },
        update: {
          nombresApellidos,
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          nacionalidad: parseString(data.nacionalidad) || undefined,
          sexo: parseString(data.sexo) || undefined,
          paisNacimiento: parseString(data.paisNacimiento) || undefined,
          departamentoNacimiento: parseString(data.departamentoNacimiento) || undefined,
          fechaNacimiento: parseDate(data.fechaNacimiento) || undefined,
          paisResidencia: parseString(data.paisResidencia) || undefined,
          gradoInstruccion: parseString(data.gradoInstruccion) || undefined,
          estadoCivil: parseString(data.estadoCivil) || undefined,
          esInversionista: parseBoolean(data.esTitularInversion, true),
          correoElectronico: correo,
          telefonoCelular: celular || undefined,
          conyugeNombresApellidos: parseString(data.conyugeNombresApellidos) || undefined,
          conyugeTipoDocumento: data.conyugeTipoDoc ? this.normalizarTipoDoc(parseString(data.conyugeTipoDoc)) : undefined,
          conyugeNumeroDocumento: parseString(data.conyugeNumDoc) || undefined,
          regimenPatrimonial: parseString(data.regimenPatrimonial) || undefined,
          fechaRegimen: parseDate(data.fechaRegimen) || undefined,
          pep: parseBoolean(data.esPep, false),
        },
      });

      // 6. Domicilio Principal
      await tx.domicilio.upsert({
        where: {
          uk_domicilio_inversionista_tipo: {
            inversionistaId: inversionista.id,
            tipo: 'DOMICILIO',
          },
        },
        create: {
          inversionistaId: inversionista.id,
          tipo: 'DOMICILIO',
          direccionCompleta: direccionDomicilio,
          departamento: parseString(data.departamento),
          provincia: parseString(data.provincia),
          distrito: parseString(data.distrito),
          pais: parseString(data.pais) || 'Perú',
          codigoPostal: parseString(data.codigoPostal),
          numero: 'S/N',
        },
        update: {
          direccionCompleta: direccionDomicilio,
          departamento: parseString(data.departamento) || undefined,
          provincia: parseString(data.provincia) || undefined,
          distrito: parseString(data.distrito) || undefined,
          pais: parseString(data.pais) || undefined,
          codigoPostal: parseString(data.codigoPostal) || undefined,
        },
      });

      // 7. Información Laboral
      const ingresoAnual = parseNumber(data.ingresoPromedioAnual);
      await tx.informacionLaboral.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          situacionLaboral: parseString(data.situacionLaboral),
          profesion: parseString(data.profesion),
          ocupacion: parseString(data.ocupacion),
          empresaCentroTrabajo: parseString(data.empresaCentroTrabajo),
          ingresoPromedioAnual: ingresoAnual !== undefined ? ingresoAnual : null,
        },
        update: {
          situacionLaboral: parseString(data.situacionLaboral) || undefined,
          profesion: parseString(data.profesion) || undefined,
          ocupacion: parseString(data.ocupacion) || undefined,
          empresaCentroTrabajo: parseString(data.empresaCentroTrabajo) || undefined,
          ingresoPromedioAnual: ingresoAnual !== undefined ? ingresoAnual : undefined,
        },
      });

      // 8. Vinculaciones y Patrimonio
      const valorPatrimonio = parseNumber(data.valorAproxPatrimonio);
      await tx.vinculaciones.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          esVinculadoCorfidGrupoCoril: parseBoolean(data.esVinculadoCorfid, false),
          haSidoClienteOtraFiduciaria: parseBoolean(data.clienteOtraFiduciaria, false),
          haSidoTrabajadorOtraFiduciaria: parseBoolean(data.trabajadorOtraFiduciaria, false),
          valorAproximadoPatrimonio: valorPatrimonio !== undefined ? valorPatrimonio : null,
        },
        update: {
          esVinculadoCorfidGrupoCoril: parseBoolean(data.esVinculadoCorfid, false),
          haSidoClienteOtraFiduciaria: parseBoolean(data.clienteOtraFiduciaria, false),
          haSidoTrabajadorOtraFiduciaria: parseBoolean(data.trabajadorOtraFiduciaria, false),
          valorAproximadoPatrimonio: valorPatrimonio !== undefined ? valorPatrimonio : undefined,
        },
      });

      // 9. Origen de Fondos
      await tx.origenFondos.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          fondosPropiosDetalle: parseString(data.fondosPropios),
          ventaActivosDetalle: parseString(data.ventaActivos),
          financiamientosDetalle: parseString(data.financiamientos),
          dividendosParticipacionesDetalle: parseString(data.dividendosParticipaciones),
          contratoObraLicitacionDetalle: parseString(data.contratoObraLicitacion),
          patrimonioFideicometidoDetalle: parseString(data.patrimonioFideicometido),
          otrosFondosDetalle: parseString(data.otrosFondosDetalle),
        },
        update: {
          fondosPropiosDetalle: parseString(data.fondosPropios) || undefined,
          ventaActivosDetalle: parseString(data.ventaActivos) || undefined,
          financiamientosDetalle: parseString(data.financiamientos) || undefined,
          dividendosParticipacionesDetalle: parseString(data.dividendosParticipaciones) || undefined,
          contratoObraLicitacionDetalle: parseString(data.contratoObraLicitacion) || undefined,
          patrimonioFideicometidoDetalle: parseString(data.patrimonioFideicometido) || undefined,
          otrosFondosDetalle: parseString(data.otrosFondosDetalle) || undefined,
        },
      });

      // 10. Apoderado (si aplica)
      if (tieneApoderado || parseString(data.apoderadoNombresApellidos)) {
        await tx.apoderado.upsert({
          where: { inversionistaId: inversionista.id },
          create: {
            inversionistaId: inversionista.id,
            nombresApellidos: parseString(data.apoderadoNombresApellidos),
            tipoDocumento: data.apoderadoTipoDoc ? this.normalizarTipoDoc(parseString(data.apoderadoTipoDoc)) : undefined,
            numeroDocumento: parseString(data.apoderadoNumDoc),
            nacionalidad: parseString(data.apoderadoNacionalidad),
            sexo: parseString(data.apoderadoSexo),
            estadoCivil: parseString(data.apoderadoEstadoCivil),
            paisNacimiento: parseString(data.apoderadoPaisNacimiento),
            fechaNacimiento: parseDate(data.apoderadoFechaNacimiento),
            paisResidencia: parseString(data.apoderadoPaisResidencia),
            gradoInstruccion: parseString(data.apoderadoGradoInstruccion),
            correoElectronico: parseString(data.apoderadoCorreo),
            telefonoCelular: parseString(data.apoderadoCelular),
            esDomiciliado: parseBoolean(data.apoderadoEsDomiciliado, true),
            partidaRegistral: parseString(data.partidaRegistral),
            asiento: parseString(data.asiento),
            zonaRegistral: parseString(data.zonaRegistral),
          },
          update: {
            nombresApellidos: parseString(data.apoderadoNombresApellidos) || undefined,
            tipoDocumento: data.apoderadoTipoDoc ? this.normalizarTipoDoc(parseString(data.apoderadoTipoDoc)) : undefined,
            numeroDocumento: parseString(data.apoderadoNumDoc) || undefined,
            nacionalidad: parseString(data.apoderadoNacionalidad) || undefined,
            partidaRegistral: parseString(data.partidaRegistral) || undefined,
            asiento: parseString(data.asiento) || undefined,
            zonaRegistral: parseString(data.zonaRegistral) || undefined,
          },
        });
      }

      // 11. Antecedentes Penales
      await tx.antecedentesPenales.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          esInvestigadoDelitos: parseBoolean(data.esInvestigadoDelitos, false),
          especificarDelitos: parseString(data.detalleDelitos),
        },
        update: {
          esInvestigadoDelitos: parseBoolean(data.esInvestigadoDelitos, false),
          especificarDelitos: parseString(data.detalleDelitos) || undefined,
        },
      });

      // 12. Residencia Fiscal
      const tributaFuera = parseBoolean(data.tributaFueraPeru, false);
      const resFiscal = await tx.residenciaFiscal.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          tieneResidenciaFiscalExtranjera: tributaFuera,
        },
        update: {
          tieneResidenciaFiscalExtranjera: tributaFuera,
        },
      });

      if (tributaFuera && (parseString(data.paisResidenciaFiscal) || parseString(data.nitTin))) {
        await tx.residenciaFiscalPais.deleteMany({
          where: { residenciaFiscalId: resFiscal.id },
        });
        await tx.residenciaFiscalPais.create({
          data: {
            residenciaFiscalId: resFiscal.id,
            pais: parseString(data.paisResidenciaFiscal) || '',
            nitTin: parseString(data.nitTin),
            orden: 0,
          },
        });
      }

      // 13. Inversión y Datos Bancarios
      const montoInicial = parseNumber(data.montoInicialInvertir);
      await tx.inversion.upsert({
        where: { inversionistaId: inversionista.id },
        create: {
          inversionistaId: inversionista.id,
          moneda: parseString(data.moneda) || 'USD',
          montoInicial: montoInicial !== undefined ? montoInicial : null,
          montoInicialLetras: parseString(data.montoEnLetras),
          origenRecursos: parseString(data.origenRecursos) || 'Ahorros personales',
          bancoNombre: parseString(data.bancoNombre),
          numeroCuenta: parseString(data.numeroCuenta),
          cuentaCci: parseString(data.cuentaCci),
        },
        update: {
          moneda: parseString(data.moneda) || undefined,
          montoInicial: montoInicial !== undefined ? montoInicial : undefined,
          montoInicialLetras: parseString(data.montoEnLetras) || undefined,
          origenRecursos: parseString(data.origenRecursos) || undefined,
          bancoNombre: parseString(data.bancoNombre) || undefined,
          numeroCuenta: parseString(data.numeroCuenta) || undefined,
          cuentaCci: parseString(data.cuentaCci) || undefined,
        },
      });

      return {
        fila: filaIndex,
        codigoFicha: ficha.codigo,
        fichaMadreId: ficha.id,
        documento: numeroDoc,
        cliente: nombresApellidos,
      };
    });
  }
}