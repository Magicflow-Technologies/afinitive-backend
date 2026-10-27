import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFideicomisoDto } from './dto/create-fideicomiso.dto.js';
import { CreateInversionFideicomisoDto } from './dto/create-inversion-fideicomiso.dto.js';
import { UpdateInversionFideicomisoDto } from './dto/update-inversion-fideicomiso.dto.js';
import { DocumentoGeneralService } from '../documento-general/documento-general.service.js';
import { parseInversionesBuffer, normalizeText } from './helpers/inversiones-parser.helper.js';

@Injectable()
export class FideicomisoService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentoGeneralService: DocumentoGeneralService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultFideicomiso();
  }

  /**
   * Asegura que exista al menos el Fideicomiso oficial por defecto (AWM LIBRE 2).
   */
  async seedDefaultFideicomiso() {
    try {
      const existe = await this.prisma.fideicomiso.findFirst({
        where: { nombre: 'AWM LIBRE 2' },
      });
      if (!existe) {
        await this.prisma.fideicomiso.create({
          data: {
            nombre: 'AWM LIBRE 2',
            fideicomitente: 'AFINITIVE S.A.C.',
            emisorFiduciario: 'Grupo Coril Sociedad Titulizadora S.A.',
            patrimonioNombreLargo:
              'Patrimonio en Fideicomiso AFINITIVE – D. Leg. N° 861, No Inscrito en la SMV, Dirigido a Inversionistas Institucionales.',
            denominacionValores: 'BONOS DE TITULIZACIÓN – PF AFINITIVE',
            tipoValor: 'Bonos de Titulización',
            monedaDefault: 'USD',
            tasaInteresDefault: '10 %',
            plazoEmisionDefault: 'Hasta de 24 meses. Base ACT/360.',
            notario: 'Notario Público de Lima Dr. Eduardo Laos de Lama',
            ruc: '20609876543',
            titularCuenta:
              'Patrimonio en Fideicomiso PF AFINITIVE -D. LEG. N° 861, Titulo XI, No Inscrito en la SMV, Dirigido a Inversionistas Institucionales.',
            bancoNombre: 'Banco de Crédito del Perú (BCP)',
            numeroCuenta: '193-98765432-1-90',
            cuentaCci: '002-193-009876543210-90',
            activo: true,
          },
        });
      }
    } catch (err) {
      console.warn('Error en seedDefaultFideicomiso:', err);
    }
  }

  // --- Catálogo de Fideicomisos ---
  async findAllFideicomisos() {
    return this.prisma.fideicomiso.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: { inversiones: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneFideicomiso(id: string) {
    return this.prisma.fideicomiso.findUniqueOrThrow({
      where: { id },
      include: {
        _count: {
          select: { inversiones: true },
        },
      },
    });
  }

  async createFideicomiso(dto: CreateFideicomisoDto) {
    return this.prisma.fideicomiso.create({ data: dto });
  }

  async updateFideicomiso(id: string, dto: Partial<CreateFideicomisoDto>) {
    return this.prisma.fideicomiso.update({ where: { id }, data: dto });
  }

  async removeFideicomiso(id: string) {
    const invCount = await this.prisma.inversionFideicomiso.count({ where: { fideicomisoId: id } });
    if (invCount > 0) {
      return this.prisma.fideicomiso.update({
        where: { id },
        data: { activo: false },
      });
    }
    return this.prisma.fideicomiso.delete({ where: { id } });
  }

  // --- Inversiones en Fideicomisos por Expediente ---
  async findInversionesByFichaMadre(fichaMadreId: string) {
    return this.prisma.inversionFideicomiso.findMany({
      where: { fichaMadreId },
      include: {
        fideicomiso: true,
        documentos: {
          include: {
            documentoPlantilla: true,
            firmas: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneInversion(id: string) {
    return this.prisma.inversionFideicomiso.findUniqueOrThrow({
      where: { id },
      include: {
        fideicomiso: true,
        documentos: {
          include: {
            documentoPlantilla: true,
            firmas: true,
          },
        },
        fichaMadre: {
          include: {
            cliente: { include: { persona: true } },
          },
        },
      },
    });
  }

  /**
   * Asocia una nueva inversión en un Fideicomiso al expediente y genera automáticamente sus 3 formatos (05, 06, 07).
   */
  async asociarInversion(dto: CreateInversionFideicomisoDto) {
    // 1. Validar Ficha Madre y Fideicomiso
    await this.prisma.fichaMadre.findUniqueOrThrow({
      where: { id: dto.fichaMadreId },
    });

    const fideicomiso = await this.prisma.fideicomiso.findUniqueOrThrow({
      where: { id: dto.fideicomisoId },
    });

    // 2. Crear Inversión en Fideicomiso
    const invFid = await this.prisma.inversionFideicomiso.create({
      data: {
        fichaMadreId: dto.fichaMadreId,
        fideicomisoId: dto.fideicomisoId,
        moneda: dto.moneda || fideicomiso.monedaDefault || 'USD',
        monto: dto.monto,
        montoLetras: dto.montoLetras,
        tasaInteres: dto.tasaInteres || fideicomiso.tasaInteresDefault || '10 %',
        plazoEmision: dto.plazoEmision || fideicomiso.plazoEmisionDefault || 'Hasta de 24 meses. Base ACT/360.',
        serieEmision: dto.serieEmision || 'Primera',
        cantidadValores: dto.cantidadValores || 'Uno (01)',
        vigenciaInstruccion: dto.vigenciaInstruccion || 'Seis (06) días hábiles',
        bancoDestino: dto.bancoDestino || fideicomiso.bancoNombre,
        numeroCuentaDestino: dto.numeroCuentaDestino || fideicomiso.numeroCuenta,
        cuentaCciDestino: dto.cuentaCciDestino || fideicomiso.cuentaCci,
        titularCuentaDestino: dto.titularCuentaDestino || fideicomiso.titularCuenta,
        vencimiento: dto.vencimiento,
        correoOpCoril: dto.correoOpCoril || fideicomiso.correoOpCorilDefault,
        correoOpCorfid: dto.correoOpCorfid || fideicomiso.correoOpCorfidDefault,
        enlaceCronograma: dto.enlaceCronograma,
        observaciones: dto.observaciones,
      },
      include: { fideicomiso: true },
    });

    // 3. Generar automáticamente los 3 formatos operativos (05, 06, 07) vinculados a esta inversión
    const plantillasOperativas = await this.prisma.documentoPlantilla.findMany({
      where: {
        archivo: {
          in: [
            '05_carta_solicitud_participacion.hbs',
            '06_instruccion_inversion.hbs',
            '07_declaracion_inversion.hbs',
          ],
        },
      },
    });

    for (const plantilla of plantillasOperativas) {
      const docGen = await this.prisma.documentoGeneral.create({
        data: {
          fichaMadreId: dto.fichaMadreId,
          documentoPlantillaId: plantilla.id,
          inversionFideicomisoId: invFid.id,
          nombreArchivo: `${plantilla.nombre} - ${fideicomiso.nombre}`,
          rutaArchivo: `/hbs/${plantilla.archivo}`,
          estado: 'PENDIENTE_FIRMA',
        },
        include: { documentoPlantilla: true },
      });

      await this.prisma.firma.create({
        data: {
          documentoGeneralId: docGen.id,
          tipo: 'ELECTRONICA',
          estado: 'PENDIENTE',
        },
      });
    }

    return this.findOneInversion(invFid.id);
  }

  async updateInversion(id: string, dto: UpdateInversionFideicomisoDto) {
    const dataToUpdate: any = {};
    if (dto.moneda !== undefined) dataToUpdate.moneda = dto.moneda;
    if (dto.monto !== undefined) dataToUpdate.monto = dto.monto;
    if (dto.montoLetras !== undefined) dataToUpdate.montoLetras = dto.montoLetras;
    if (dto.tasaInteres !== undefined) dataToUpdate.tasaInteres = dto.tasaInteres;
    if (dto.plazoEmision !== undefined) dataToUpdate.plazoEmision = dto.plazoEmision;
    if (dto.serieEmision !== undefined) dataToUpdate.serieEmision = dto.serieEmision;
    if (dto.cantidadValores !== undefined) dataToUpdate.cantidadValores = dto.cantidadValores;
    if (dto.vigenciaInstruccion !== undefined) dataToUpdate.vigenciaInstruccion = dto.vigenciaInstruccion;
    if (dto.bancoDestino !== undefined) dataToUpdate.bancoDestino = dto.bancoDestino;
    if (dto.numeroCuentaDestino !== undefined) dataToUpdate.numeroCuentaDestino = dto.numeroCuentaDestino;
    if (dto.cuentaCciDestino !== undefined) dataToUpdate.cuentaCciDestino = dto.cuentaCciDestino;
    if (dto.titularCuentaDestino !== undefined) dataToUpdate.titularCuentaDestino = dto.titularCuentaDestino;
    if (dto.vencimiento !== undefined) dataToUpdate.vencimiento = dto.vencimiento;
    if (dto.correoOpCoril !== undefined) dataToUpdate.correoOpCoril = dto.correoOpCoril;
    if (dto.correoOpCorfid !== undefined) dataToUpdate.correoOpCorfid = dto.correoOpCorfid;
    if (dto.enlaceCronograma !== undefined) dataToUpdate.enlaceCronograma = dto.enlaceCronograma;
    if (dto.observaciones !== undefined) dataToUpdate.observaciones = dto.observaciones;

    return this.prisma.inversionFideicomiso.update({
      where: { id },
      data: dataToUpdate,
      include: {
        fideicomiso: true,
        documentos: { include: { documentoPlantilla: true, firmas: true } },
      },
    });
  }

  async removeInversion(id: string) {
    const inv = await this.prisma.inversionFideicomiso.findUniqueOrThrow({
      where: { id },
      include: { documentos: true },
    });

    for (const doc of inv.documentos) {
      await this.prisma.firma.deleteMany({ where: { documentoGeneralId: doc.id } });
      await this.prisma.documentoGeneral.delete({ where: { id: doc.id } });
    }

    return this.prisma.inversionFideicomiso.delete({ where: { id } });
  }

  async getPdfPackFideicomiso(inversionFideicomisoId: string): Promise<Buffer> {
    return this.documentoGeneralService.generatePdfPackFideicomiso(inversionFideicomisoId);
  }

  /**
   * Resumen y listado completo de inversiones para la Vista del Cliente / Portal del Inversionista
   */
  async getPortalResumen(clienteOrPersonaId: string) {
    // 1. Buscar cliente por id o personaId
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        OR: [
          { id: clienteOrPersonaId },
          { personaId: clienteOrPersonaId },
        ],
      },
      include: {
        persona: true,
        fichaMadre: {
          include: {
            documentos: {
              include: {
                documentoPlantilla: true,
                firmas: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado en el sistema.');
    }

    if (!cliente.fichaMadre) {
      return {
        cliente: {
          id: cliente.id,
          nombres: cliente.persona.nombres,
          apellidos: cliente.persona.apellidos,
          numeroDocumento: cliente.persona.numeroDocumento,
          tipoDocumento: cliente.persona.tipoDocumento,
          correo: cliente.persona.correo,
          telefono: cliente.persona.telefono,
        },
        fichaMadreId: null,
        codigoExpediente: null,
        estadoExpediente: 'PENDIENTE',
        totalInvertidoUSD: 0,
        totalInvertidoPEN: 0,
        totalInversiones: 0,
        tasaPromedio: '0 %',
        inversiones: [],
        documentosGenerales: [],
      };
    }

    // 2. Obtener inversiones en fideicomisos
    const inversiones = await this.prisma.inversionFideicomiso.findMany({
      where: { fichaMadreId: cliente.fichaMadre.id },
      include: {
        fideicomiso: true,
        documentos: {
          include: {
            documentoPlantilla: true,
            firmas: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Calcular métricas
    let totalUSD = 0;
    let totalPEN = 0;
    let sumaTasas = 0;
    let countTasas = 0;

    for (const inv of inversiones) {
      const montoNum = Number(inv.monto || 0);
      if (inv.moneda === 'PEN') {
        totalPEN += montoNum;
      } else {
        totalUSD += montoNum;
      }

      if (inv.tasaInteres) {
        const match = inv.tasaInteres.match(/([\d.]+)/);
        if (match) {
          sumaTasas += parseFloat(match[1]);
          countTasas++;
        }
      }
    }

    const tasaPromedioStr = countTasas > 0 ? `${(sumaTasas / countTasas).toFixed(2)} %` : '10 %';

    return {
      cliente: {
        id: cliente.id,
        nombres: cliente.persona.nombres,
        apellidos: cliente.persona.apellidos,
        numeroDocumento: cliente.persona.numeroDocumento,
        tipoDocumento: cliente.persona.tipoDocumento,
        correo: cliente.persona.correo,
        telefono: cliente.persona.telefono,
      },
      fichaMadreId: cliente.fichaMadre.id,
      codigoExpediente: cliente.fichaMadre.codigo,
      estadoExpediente: cliente.fichaMadre.estado,
      totalInvertidoUSD: totalUSD,
      totalInvertidoPEN: totalPEN,
      totalInversiones: inversiones.length,
      tasaPromedio: tasaPromedioStr,
      inversiones: inversiones.map((inv) => ({
        id: inv.id,
        fideicomisoId: inv.fideicomisoId,
        fideicomisoNombre: inv.fideicomiso.nombre,
        patrimonioNombreLargo: inv.fideicomiso.patrimonioNombreLargo,
        emisorFiduciario: inv.fideicomiso.emisorFiduciario,
        moneda: inv.moneda,
        monto: Number(inv.monto),
        montoLetras: inv.montoLetras,
        tasaInteres: inv.tasaInteres || '10 %',
        plazoEmision: inv.plazoEmision || 'Hasta 24 meses',
        vencimiento: inv.vencimiento || 'Al vencimiento del fideicomiso',
        correoOpCoril: inv.correoOpCoril || 'operaciones@grupocoril.com',
        correoOpCorfid: inv.correoOpCorfid || 'operaciones@corfid.com.pe',
        enlaceCronograma: inv.enlaceCronograma || '',
        bancoDestino: inv.bancoDestino,
        numeroCuentaDestino: inv.numeroCuentaDestino,
        cuentaCciDestino: inv.cuentaCciDestino,
        titularCuentaDestino: inv.titularCuentaDestino,
        estado: inv.estado,
        documentos: inv.documentos.map((d) => ({
          id: d.id,
          nombreArchivo: d.nombreArchivo,
          estado: d.estado,
          rutaArchivo: d.rutaArchivo,
          esFirmado: d.estado === 'FIRMADO' || d.firmas.some((f) => f.estado === 'FIRMADO'),
        })),
        createdAt: inv.createdAt,
      })),
      documentosGenerales: cliente.fichaMadre.documentos.map((d) => ({
        id: d.id,
        nombreArchivo: d.nombreArchivo,
        estado: d.estado,
        rutaArchivo: d.rutaArchivo,
        inversionFideicomisoId: d.inversionFideicomisoId,
        esFirmado: d.estado === 'FIRMADO' || d.firmas.some((f) => f.estado === 'FIRMADO'),
      })),
    };
  }

  /**
   * Carga e importación masiva de Inversiones en Fideicomisos desde Excel o HTML
   */
  async importarInversionesMasivas(fileBuffer: Buffer, fileName: string) {
    // 1. Extraer filas estructuradas
    const rawRows = await parseInversionesBuffer(fileBuffer, fileName);
    if (rawRows.length === 0) {
      throw new BadRequestException('El archivo no contiene filas válidas de inversiones.');
    }

    // 2. Precargar todos los clientes con sus personas y fichas madre
    const clientes = await this.prisma.cliente.findMany({
      include: {
        persona: true,
        fichaMadre: true,
      },
    });

    // 3. Precargar catálogo de fideicomisos
    const fideicomisos = await this.prisma.fideicomiso.findMany();
    const fideicomisoMap = new Map<string, any>();
    fideicomisos.forEach((f) => {
      fideicomisoMap.set(normalizeText(f.nombre), f);
    });

    // 4. Asesor fallback en caso de necesitar crear FichaMadre
    const defaultEmpleado = await this.prisma.empleado.findFirst({
      where: { activo: true },
    });

    const exitosos: Array<{
      fila: number;
      inversionista: string;
      fideicomiso: string;
      monto: number;
      moneda: string;
      tasa: string;
      vencimiento: string;
      accion: 'CREADO' | 'ACTUALIZADO';
    }> = [];

    const errores: Array<{
      fila: number;
      inversionista: string;
      motivo: string;
    }> = [];

    for (const row of rawRows) {
      try {
        const invNorm = normalizeText(row.inversionistaRaw);
        if (!invNorm) {
          errores.push({ fila: row.fila, inversionista: '(Vacío)', motivo: 'Nombre del inversionista vacío' });
          continue;
        }

        // Buscar cliente coincidente
        let matchedCliente = clientes.find((c) => {
          // Coincidencia exacta por DNI/RUC si row contiene números
          const docDigits = row.inversionistaRaw.replace(/\D/g, '');
          if (docDigits.length >= 8 && c.persona.numeroDocumento.includes(docDigits)) {
            return true;
          }

          const pNom = normalizeText(`${c.persona.nombres} ${c.persona.apellidos}`);
          const pApe = normalizeText(`${c.persona.apellidos} ${c.persona.nombres}`);

          if (pNom === invNorm || pApe === invNorm) return true;

          // Comparación por tokens
          const tokensInput = invNorm.split(' ').filter((t) => t.length > 2);
          const tokensPersona = pNom.split(' ').filter((t) => t.length > 2);

          if (tokensInput.length >= 2 && tokensPersona.length >= 2) {
            const matchesCount = tokensInput.filter((t) => tokensPersona.includes(t)).length;
            if (matchesCount >= Math.min(tokensInput.length, tokensPersona.length) - 1 && matchesCount >= 2) {
              return true;
            }
          }

          return false;
        });

        if (!matchedCliente) {
          errores.push({
            fila: row.fila,
            inversionista: row.inversionistaRaw,
            motivo: `No se encontró cliente registrado en el sistema que coincida con "${row.inversionistaRaw}". Debe importarse o crearse primero como cliente.`,
          });
          continue;
        }

        // Asegurar FichaMadre
        let fichaMadreId = matchedCliente.fichaMadre?.id;
        if (!fichaMadreId) {
          if (!defaultEmpleado) {
            throw new BadRequestException('No hay asesores/empleados registrados para crear el expediente.');
          }
          const year = new Date().getFullYear();
          const count = await this.prisma.fichaMadre.count();
          const codigo = `FM-${year}-${String(count + 1).padStart(6, '0')}`;

          const nuevaFicha = await this.prisma.fichaMadre.create({
            data: {
              codigo,
              clienteId: matchedCliente.id,
              empleadoId: defaultEmpleado.id,
              estado: 'PENDIENTE',
            },
          });
          fichaMadreId = nuevaFicha.id;
        }

        // Resolver o crear Fideicomiso
        const fidNameNorm = normalizeText(row.fideicomisoRaw);
        let fid = fideicomisoMap.get(fidNameNorm);
        if (!fid) {
          const fidNombreOficial = row.fideicomisoRaw.trim() || 'AWM LIBRE 2';
          fid = await this.prisma.fideicomiso.create({
            data: {
              nombre: fidNombreOficial,
              fideicomitente: 'AFINITIVE S.A.C.',
              emisorFiduciario: 'Grupo Coril Sociedad Titulizadora S.A.',
              patrimonioNombreLargo: `Patrimonio en Fideicomiso ${fidNombreOficial}`,
              denominacionValores: `BONOS DE TITULIZACIÓN – ${fidNombreOficial}`,
              tipoValor: 'Bonos de Titulización',
              monedaDefault: row.moneda,
              tasaInteresDefault: row.tasaAnualRaw || '10 %',
              correoOpCorilDefault: row.correoOpCoril || 'operaciones@grupocoril.com',
              correoOpCorfidDefault: row.correoOpCorfid || 'operaciones@corfid.com.pe',
              activo: true,
            },
          });
          fideicomisoMap.set(fidNameNorm, fid);
        }

        // Verificar si la inversión ya existe
        const existente = await this.prisma.inversionFideicomiso.findFirst({
          where: {
            fichaMadreId,
            fideicomisoId: fid.id,
          },
        });

        if (existente) {
          await this.updateInversion(existente.id, {
            monto: row.montoNumerico > 0 ? row.montoNumerico : Number(existente.monto),
            moneda: row.moneda,
            tasaInteres: row.tasaAnualRaw || existente.tasaInteres || '10 %',
            vencimiento: row.vencimientoRaw || existente.vencimiento || undefined,
            correoOpCoril: row.correoOpCoril || existente.correoOpCoril || undefined,
            correoOpCorfid: row.correoOpCorfid || existente.correoOpCorfid || undefined,
            enlaceCronograma: row.enlaceCronograma || existente.enlaceCronograma || undefined,
          });

          exitosos.push({
            fila: row.fila,
            inversionista: `${matchedCliente.persona.nombres} ${matchedCliente.persona.apellidos}`,
            fideicomiso: fid.nombre,
            monto: row.montoNumerico > 0 ? row.montoNumerico : Number(existente.monto),
            moneda: row.moneda,
            tasa: row.tasaAnualRaw,
            vencimiento: row.vencimientoRaw,
            accion: 'ACTUALIZADO',
          });
        } else {
          await this.asociarInversion({
            fichaMadreId,
            fideicomisoId: fid.id,
            monto: row.montoNumerico,
            moneda: row.moneda,
            tasaInteres: row.tasaAnualRaw || fid.tasaInteresDefault || '10 %',
            vencimiento: row.vencimientoRaw,
            correoOpCoril: row.correoOpCoril || fid.correoOpCorilDefault || 'operaciones@grupocoril.com',
            correoOpCorfid: row.correoOpCorfid || fid.correoOpCorfidDefault || 'operaciones@corfid.com.pe',
            enlaceCronograma: row.enlaceCronograma,
          });

          exitosos.push({
            fila: row.fila,
            inversionista: `${matchedCliente.persona.nombres} ${matchedCliente.persona.apellidos}`,
            fideicomiso: fid.nombre,
            monto: row.montoNumerico,
            moneda: row.moneda,
            tasa: row.tasaAnualRaw,
            vencimiento: row.vencimientoRaw,
            accion: 'CREADO',
          });
        }
      } catch (err: any) {
        errores.push({
          fila: row.fila,
          inversionista: row.inversionistaRaw,
          motivo: err.message || 'Error desconocido al procesar la fila',
        });
      }
    }

    return {
      totalFilas: rawRows.length,
      totalExitosos: exitosos.length,
      totalErrores: errores.length,
      exitosos,
      errores,
    };
  }
}
