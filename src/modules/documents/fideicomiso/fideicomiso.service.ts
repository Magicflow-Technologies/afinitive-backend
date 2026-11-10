import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFideicomisoDto } from './dto/create-fideicomiso.dto.js';
import { CreateInversionFideicomisoDto } from './dto/create-inversion-fideicomiso.dto.js';
import { UpdateInversionFideicomisoDto } from './dto/update-inversion-fideicomiso.dto.js';
import { DocumentoGeneralService } from '../documento-general/documento-general.service.js';
import { parseInversionesBuffer, normalizeText, isDateLike } from './helpers/inversiones-parser.helper.js';

@Injectable()
export class FideicomisoService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentoGeneralService: DocumentoGeneralService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultFideicomiso();
    await this.syncLegacyInversiones();
  }

  /**
   * Sincroniza retroactivamente clientes con ficha madre histórica que tengan montos de inversión
   * en la tabla KYC (inversion) pero que aún no tengan un registro en InversionFideicomiso.
   */
  async syncLegacyInversiones() {
    try {
      const defaultFid = await this.prisma.fideicomiso.findFirst({
        where: { activo: true },
        orderBy: [
          { correoOpCorilDefault: 'desc' },
          { nombre: 'asc' },
        ],
      });
      if (!defaultFid) return;

      const fichasSinInversionFid = await this.prisma.fichaMadre.findMany({
        where: {
          inversionesFideicomiso: { none: {} },
          inversionista: {
            inversion: {
              montoInicial: { not: null, gt: 0 },
            },
          },
        },
        include: {
          inversionista: {
            include: { inversion: true },
          },
        },
      });

      for (const fm of fichasSinInversionFid) {
        const invKyc = fm.inversionista?.inversion;
        if (!invKyc || !invKyc.montoInicial) continue;

        const invFid = await this.prisma.inversionFideicomiso.create({
          data: {
            fichaMadreId: fm.id,
            fideicomisoId: defaultFid.id,
            moneda: invKyc.moneda || defaultFid.monedaDefault || 'USD',
            monto: invKyc.montoInicial,
            montoLetras: invKyc.montoInicialLetras,
            tasaInteres: defaultFid.tasaInteresDefault || '10 %',
            plazoEmision: defaultFid.plazoEmisionDefault || 'Hasta de 24 meses. Base ACT/360.',
            serieEmision: 'Primera',
            cantidadValores: 'Uno (01)',
            vigenciaInstruccion: 'Seis (06) días hábiles',
            bancoDestino: defaultFid.bancoNombre,
            numeroCuentaDestino: defaultFid.numeroCuenta,
            cuentaCciDestino: defaultFid.cuentaCci,
            titularCuentaDestino: defaultFid.titularCuenta,
            correoOpCoril: defaultFid.correoOpCorilDefault || 'operacionesst@grupocoril.com',
            correoOpCorfid: defaultFid.correoOpCorfidDefault || 'operacionescorfid@corfid.com.pe',
            estado: 'PENDIENTE',
          },
        });

        // Vincular formatos 05, 06, 07 huérfanos de esta ficha madre
        await this.prisma.documentoGeneral.updateMany({
          where: {
            fichaMadreId: fm.id,
            inversionFideicomisoId: null,
            documentoPlantilla: {
              archivo: {
                in: [
                  '05_carta_solicitud_participacion.hbs',
                  '06_instruccion_inversion.hbs',
                  '07_declaracion_inversion.hbs',
                ],
              },
            },
          },
          data: {
            inversionFideicomisoId: invFid.id,
          },
        });
      }
    } catch (err) {
      console.warn('Error en syncLegacyInversiones:', err);
    }
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
        tipoValor: dto.tipoValor || fideicomiso.tipoValor || '',
        bancoDestino: dto.bancoDestino || fideicomiso.bancoNombre,
        numeroCuentaDestino: dto.numeroCuentaDestino || fideicomiso.numeroCuenta,
        cuentaCciDestino: dto.cuentaCciDestino || fideicomiso.cuentaCci,
        titularCuentaDestino: dto.titularCuentaDestino || fideicomiso.titularCuenta,
        representanteNombre: dto.representanteNombre || fideicomiso.representanteLegal || '',
        representanteDni: dto.representanteDni || fideicomiso.representanteLegalDni || '',
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
    if (dto.tipoValor !== undefined) dataToUpdate.tipoValor = dto.tipoValor;
    if (dto.bancoDestino !== undefined) dataToUpdate.bancoDestino = dto.bancoDestino;
    if (dto.numeroCuentaDestino !== undefined) dataToUpdate.numeroCuentaDestino = dto.numeroCuentaDestino;
    if (dto.cuentaCciDestino !== undefined) dataToUpdate.cuentaCciDestino = dto.cuentaCciDestino;
    if (dto.titularCuentaDestino !== undefined) dataToUpdate.titularCuentaDestino = dto.titularCuentaDestino;
    if (dto.representanteNombre !== undefined) dataToUpdate.representanteNombre = dto.representanteNombre;
    if (dto.representanteDni !== undefined) dataToUpdate.representanteDni = dto.representanteDni;
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
    let inversiones = await this.prisma.inversionFideicomiso.findMany({
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

    if (inversiones.length === 0) {
      await this.syncLegacyInversiones();
      inversiones = await this.prisma.inversionFideicomiso.findMany({
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
    }

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
   * Helper unificado para buscar cliente coincidente por DNI/RUC o nombres/apellidos
   */
  private findMatchedCliente(inversionistaRaw: string, clientes: any[]) {
    const invNorm = normalizeText(inversionistaRaw);
    if (!invNorm) return null;

    const docDigits = inversionistaRaw.replace(/\D/g, '');
    if (docDigits.length >= 8) {
      const byDoc = clientes.find((c) => c.persona?.numeroDocumento?.includes(docDigits));
      if (byDoc) return byDoc;
    }

    return clientes.find((c) => {
      const pNom = normalizeText(`${c.persona?.nombres} ${c.persona?.apellidos}`);
      const pApe = normalizeText(`${c.persona?.apellidos} ${c.persona?.nombres}`);
      if (pNom === invNorm || pApe === invNorm) return true;

      const tokensInput = invNorm.split(' ').filter((t: string) => t.length > 2);
      const tokensPersona = pNom.split(' ').filter((t: string) => t.length > 2);

      if (tokensInput.length >= 2 && tokensPersona.length >= 2) {
        const matchesCount = tokensInput.filter((t: string) => tokensPersona.includes(t)).length;
        if (matchesCount >= Math.min(tokensInput.length, tokensPersona.length) - 1 && matchesCount >= 2) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * FASE 1: Validación y Simulación previa (Dry-Run / No modifica la base de datos)
   * Analiza todas las filas, verifica existencia en catálogo y consistencia de datos.
   */
  async validarInversionesMasivas(fileBuffer: Buffer, fileName: string) {
    const rawRows = await parseInversionesBuffer(fileBuffer, fileName);
    if (rawRows.length === 0) {
      throw new BadRequestException('El archivo no contiene filas válidas de inversiones.');
    }

    const clientes = await this.prisma.cliente.findMany({
      include: {
        persona: true,
        fichaMadre: true,
      },
    });

    const fideicomisos = await this.prisma.fideicomiso.findMany();
    const fideicomisoMap = new Map<string, any>();
    fideicomisos.forEach((f) => {
      fideicomisoMap.set(normalizeText(f.nombre), f);
    });

    const filasValidas: Array<{
      fila: number;
      numero?: string;
      inversionistaRaw: string;
      clienteId: string;
      clienteNombre: string;
      fideicomisoId: string;
      fideicomisoNombre: string;
      monto: number;
      moneda: string;
      tasa: string;
      vencimiento: string;
      correoOpCoril?: string;
      correoOpCorfid?: string;
      enlaceCronograma?: string;
    }> = [];

    const inconsistencias: Array<{
      fila: number;
      inversionista: string;
      campo: 'cliente' | 'fideicomiso' | 'monto' | 'tasa' | 'formato';
      motivo: string;
      valorDetectado?: string;
    }> = [];

    const fideicomisosFaltantesSet = new Set<string>();

    for (const row of rawRows) {
      const invNorm = normalizeText(row.inversionistaRaw);
      if (!invNorm) {
        inconsistencias.push({
          fila: row.fila,
          inversionista: '(Vacío)',
          campo: 'cliente',
          motivo: 'Nombre del inversionista no especificado en la fila.',
        });
        continue;
      }

      // 1. Validar Cliente
      const matchedCliente = this.findMatchedCliente(row.inversionistaRaw, clientes);
      if (!matchedCliente) {
        inconsistencias.push({
          fila: row.fila,
          inversionista: row.inversionistaRaw,
          campo: 'cliente',
          motivo: `El cliente "${row.inversionistaRaw}" no está registrado en el sistema. Debe registrarse primero como cliente.`,
          valorDetectado: row.inversionistaRaw,
        });
        continue;
      }

      // 2. Validar Fideicomiso (ESTRICTO - NO AUTO-CREACIÓN)
      const fidNameNorm = normalizeText(row.fideicomisoRaw);
      if (!fidNameNorm) {
        inconsistencias.push({
          fila: row.fila,
          inversionista: `${matchedCliente.persona?.nombres} ${matchedCliente.persona?.apellidos}`,
          campo: 'fideicomiso',
          motivo: 'No se especificó el nombre del Fideicomiso en el archivo.',
          valorDetectado: '(Vacío)',
        });
        continue;
      }

      const fid = fideicomisoMap.get(fidNameNorm);
      if (!fid) {
        fideicomisosFaltantesSet.add(row.fideicomisoRaw.trim());
        inconsistencias.push({
          fila: row.fila,
          inversionista: `${matchedCliente.persona?.nombres} ${matchedCliente.persona?.apellidos}`,
          campo: 'fideicomiso',
          motivo: `El fideicomiso "${row.fideicomisoRaw.trim()}" no existe en el Catálogo Oficial. El administrador debe crearlo previamente en el Catálogo de Fideicomisos.`,
          valorDetectado: row.fideicomisoRaw.trim(),
        });
        continue;
      }

      // 3. Validar Monto
      if (row.montoNumerico <= 0) {
        inconsistencias.push({
          fila: row.fila,
          inversionista: `${matchedCliente.persona?.nombres} ${matchedCliente.persona?.apellidos}`,
          campo: 'monto',
          motivo: `Monto inválido o no reconocido (${row.montoRaw || '0'}). Debe ser un número mayor a 0.`,
          valorDetectado: row.montoRaw,
        });
        continue;
      }

      // 4. Validar Tasa (no puede ser fecha)
      if (isDateLike(row.tasaAnualRaw)) {
        inconsistencias.push({
          fila: row.fila,
          inversionista: `${matchedCliente.persona?.nombres} ${matchedCliente.persona?.apellidos}`,
          campo: 'tasa',
          motivo: `La tasa detectada ("${row.tasaAnualRaw}") tiene formato de fecha en vez de porcentaje.`,
          valorDetectado: row.tasaAnualRaw,
        });
        continue;
      }

      filasValidas.push({
        fila: row.fila,
        numero: row.numero,
        inversionistaRaw: row.inversionistaRaw,
        clienteId: matchedCliente.id,
        clienteNombre: `${matchedCliente.persona?.nombres} ${matchedCliente.persona?.apellidos}`,
        fideicomisoId: fid.id,
        fideicomisoNombre: fid.nombre,
        monto: row.montoNumerico,
        moneda: row.moneda,
        tasa: row.tasaAnualRaw || fid.tasaInteresDefault || '10 %',
        vencimiento: row.vencimientoRaw || '',
        correoOpCoril: row.correoOpCoril || fid.correoOpCorilDefault || undefined,
        correoOpCorfid: row.correoOpCorfid || fid.correoOpCorfidDefault || undefined,
        enlaceCronograma: row.enlaceCronograma || undefined,
      });
    }

    return {
      totalFilas: rawRows.length,
      totalValidas: filasValidas.length,
      totalInconsistencias: inconsistencias.length,
      puedeProceder: filasValidas.length > 0 && fideicomisosFaltantesSet.size === 0,
      fideicomisosFaltantes: Array.from(fideicomisosFaltantesSet),
      filasValidas,
      inconsistencias,
    };
  }

  /**
   * FASE 2: Confirmación y Persistencia Real de Inversiones Verificadas
   */
  async confirmarInversionesMasivas(
    filasValidas: Array<{
      fila: number;
      clienteId: string;
      fideicomisoId: string;
      monto: number;
      moneda: string;
      tasa: string;
      vencimiento: string;
      correoOpCoril?: string;
      correoOpCorfid?: string;
      enlaceCronograma?: string;
    }>,
  ) {
    if (!Array.isArray(filasValidas) || filasValidas.length === 0) {
      throw new BadRequestException('No se han enviado filas válidas para confirmar e importar.');
    }

    const defaultEmpleado = await this.prisma.empleado.findFirst({
      where: { activo: true },
    });

    const exitosos: Array<any> = [];
    const errores: Array<any> = [];

    for (const row of filasValidas) {
      try {
        const cliente = await this.prisma.cliente.findUnique({
          where: { id: row.clienteId },
          include: { persona: true, fichaMadre: true },
        });

        if (!cliente) {
          errores.push({ fila: row.fila, motivo: `Cliente con ID ${row.clienteId} no encontrado.` });
          continue;
        }

        const fid = await this.prisma.fideicomiso.findUnique({
          where: { id: row.fideicomisoId },
        });

        if (!fid) {
          errores.push({ fila: row.fila, motivo: `Fideicomiso con ID ${row.fideicomisoId} no existe en el catálogo.` });
          continue;
        }

        // Asegurar FichaMadre
        let fichaMadreId = cliente.fichaMadre?.id;
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
              clienteId: cliente.id,
              empleadoId: defaultEmpleado.id,
              estado: 'PENDIENTE',
            },
          });
          fichaMadreId = nuevaFicha.id;
        }

        const existente = await this.prisma.inversionFideicomiso.findFirst({
          where: {
            fichaMadreId,
            fideicomisoId: fid.id,
          },
        });

        if (existente) {
          await this.updateInversion(existente.id, {
            monto: row.monto > 0 ? row.monto : Number(existente.monto),
            moneda: row.moneda,
            tasaInteres: row.tasa || existente.tasaInteres || '10 %',
            vencimiento: row.vencimiento || existente.vencimiento || undefined,
            correoOpCoril: row.correoOpCoril || existente.correoOpCoril || undefined,
            correoOpCorfid: row.correoOpCorfid || existente.correoOpCorfid || undefined,
            enlaceCronograma: row.enlaceCronograma || existente.enlaceCronograma || undefined,
          });

          exitosos.push({
            fila: row.fila,
            inversionista: `${cliente.persona.nombres} ${cliente.persona.apellidos}`,
            fideicomiso: fid.nombre,
            monto: row.monto,
            moneda: row.moneda,
            tasa: row.tasa,
            vencimiento: row.vencimiento,
            accion: 'ACTUALIZADO',
          });
        } else {
          await this.asociarInversion({
            fichaMadreId,
            fideicomisoId: fid.id,
            monto: row.monto,
            moneda: row.moneda,
            tasaInteres: row.tasa || fid.tasaInteresDefault || '10 %',
            vencimiento: row.vencimiento,
            correoOpCoril: row.correoOpCoril || fid.correoOpCorilDefault || 'operaciones@grupocoril.com',
            correoOpCorfid: row.correoOpCorfid || fid.correoOpCorfidDefault || 'operaciones@corfid.com.pe',
            enlaceCronograma: row.enlaceCronograma,
          });

          exitosos.push({
            fila: row.fila,
            inversionista: `${cliente.persona.nombres} ${cliente.persona.apellidos}`,
            fideicomiso: fid.nombre,
            monto: row.monto,
            moneda: row.moneda,
            tasa: row.tasa,
            vencimiento: row.vencimiento,
            accion: 'CREADO',
          });
        }
      } catch (err: any) {
        errores.push({
          fila: row.fila,
          motivo: err.message || 'Error al persistir inversión',
        });
      }
    }

    return {
      totalFilas: filasValidas.length,
      totalExitosos: exitosos.length,
      totalErrores: errores.length,
      exitosos,
      errores,
    };
  }

  /**
   * Carga e importación masiva directa (con validación estricta y sin auto-crear fideicomisos)
   */
  async importarInversionesMasivas(fileBuffer: Buffer, fileName: string) {
    const rawRows = await parseInversionesBuffer(fileBuffer, fileName);
    if (rawRows.length === 0) {
      throw new BadRequestException('El archivo no contiene filas válidas de inversiones.');
    }

    const clientes = await this.prisma.cliente.findMany({
      include: {
        persona: true,
        fichaMadre: true,
      },
    });

    const fideicomisos = await this.prisma.fideicomiso.findMany();
    const fideicomisoMap = new Map<string, any>();
    fideicomisos.forEach((f) => {
      fideicomisoMap.set(normalizeText(f.nombre), f);
    });

    const defaultEmpleado = await this.prisma.empleado.findFirst({
      where: { activo: true },
    });

    const exitosos: Array<any> = [];
    const errores: Array<any> = [];

    for (const row of rawRows) {
      try {
        const invNorm = normalizeText(row.inversionistaRaw);
        if (!invNorm) {
          errores.push({ fila: row.fila, inversionista: '(Vacío)', motivo: 'Nombre del inversionista vacío' });
          continue;
        }

        const matchedCliente = this.findMatchedCliente(row.inversionistaRaw, clientes);
        if (!matchedCliente) {
          errores.push({
            fila: row.fila,
            inversionista: row.inversionistaRaw,
            motivo: `No se encontró cliente registrado en el sistema que coincida con "${row.inversionistaRaw}". Debe importarse o crearse primero como cliente.`,
          });
          continue;
        }

        // VALIDACIÓN ESTRICTA: NO AUTO-CREAR FIDEICOMISOS
        const fidNameNorm = normalizeText(row.fideicomisoRaw);
        const fid = fideicomisoMap.get(fidNameNorm);
        if (!fid) {
          errores.push({
            fila: row.fila,
            inversionista: `${matchedCliente.persona.nombres} ${matchedCliente.persona.apellidos}`,
            motivo: `El fideicomiso "${row.fideicomisoRaw.trim()}" no existe en el Catálogo Oficial. El administrador debe crearlo previamente en el Catálogo de Fideicomisos.`,
          });
          continue;
        }

        if (row.montoNumerico <= 0) {
          errores.push({
            fila: row.fila,
            inversionista: `${matchedCliente.persona.nombres} ${matchedCliente.persona.apellidos}`,
            motivo: `Monto inválido (${row.montoRaw || '0'}).`,
          });
          continue;
        }

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
