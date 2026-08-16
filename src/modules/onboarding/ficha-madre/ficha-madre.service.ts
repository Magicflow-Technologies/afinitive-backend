import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateFichaMadreDto } from './dto/create-ficha-madre.dto.js';
import { UpdateFichaMadreDto } from './dto/update-ficha-madre.dto.js';
import { CreateFichaInicialDto } from './dto/create-ficha-inicial.dto.js';
import { SaveInversionistaDto } from './dto/save-inversionista.dto.js';
import { toFichaMadreObject } from './ficha-madre.mapper.js';
import { TipoDocumento } from '../../../generated/prisma/index.js';

const TIPOS_DOCUMENTO = new Set(['DNI', 'RUC', 'CE', 'PASAPORTE']);

function normTipoDoc(value?: string): TipoDocumento | undefined {
  if (!value) return undefined;
  const up = value.trim().toUpperCase();
  return TIPOS_DOCUMENTO.has(up) ? (up as TipoDocumento) : undefined;
}

function num(value?: number | string | null): number | string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

@Injectable()
export class FichaMadreService {
  private readonly logger = new Logger(FichaMadreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFichaMadreDto) {
    this.logger.log(`Creating Ficha Madre for client: ${dto.clienteId}`);

    const existing = await this.prisma.fichaMadre.findUnique({ where: { clienteId: dto.clienteId } });
    if (existing) {
      this.logger.warn(`Client ${dto.clienteId} already has a Ficha Madre`);
      throw new ConflictException('El cliente ya tiene una Ficha Madre');
    }

    const codigo = await this.generateCodigo();

    const ficha = await this.prisma.fichaMadre.create({
      data: { ...dto, codigo },
      include: { cliente: { include: { persona: true } }, empleado: { include: { persona: true } } },
    });

    this.logger.log(`Ficha Madre created: ${codigo} (ID: ${ficha.id})`);
    return ficha;
  }

  async createInicial(dto: CreateFichaInicialDto) {
    this.logger.log(`Creating initial ficha for document: ${dto.tipoDocumento}-${dto.numeroDocumento}`);

    const existingPersona = await this.prisma.persona.findUnique({
      where: {
        uk_persona_documento: {
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento,
        },
      },
    });

    const persona = existingPersona
      ? await this.prisma.persona.update({
          where: { id: existingPersona.id },
          data: {
            nombres: dto.nombres,
            apellidos: dto.apellidos,
            correo: dto.correo,
            telefono: dto.telefono,
            direccion: dto.direccion,
          },
        })
      : await this.prisma.persona.create({
          data: {
            tipoDocumento: dto.tipoDocumento,
            numeroDocumento: dto.numeroDocumento,
            nombres: dto.nombres,
            apellidos: dto.apellidos,
            correo: dto.correo,
            telefono: dto.telefono,
            direccion: dto.direccion,
          },
        });

    let cliente = await this.prisma.cliente.findUnique({
      where: { personaId: persona.id },
      include: { persona: true },
    });

    if (!cliente) {
      cliente = await this.prisma.cliente.create({
        data: { personaId: persona.id },
        include: { persona: true },
      });
    }

    const fichaExistente = await this.prisma.fichaMadre.findUnique({
      where: { clienteId: cliente.id },
    });

    if (fichaExistente) {
      throw new ConflictException('El cliente ya tiene una Ficha Madre');
    }

    const maxIntentos = 5;
    let ficha: Awaited<ReturnType<typeof this.prisma.fichaMadre.create>>;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      const codigo = await this.generateCodigo();
      try {
        ficha = await this.prisma.fichaMadre.create({
          data: {
            codigo,
            clienteId: cliente.id,
            empleadoId: dto.empleadoId,
            observaciones: dto.observaciones,
          },
          include: { cliente: { include: { persona: true } }, empleado: { include: { persona: true } } },
        });
        this.logger.log(`Initial Ficha Madre created: ${codigo} (ID: ${ficha.id})`);
        return ficha;
      } catch (err: any) {
        if (err?.code === 'P2002' && intento < maxIntentos) {
          continue;
        }
        throw err;
      }
    }

    throw new ConflictException('No se pudo generar un código único para la Ficha Madre');
  }

  async findAll(params?: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    this.logger.debug('Fetching all Fichas Madre');
    return this.prisma.fichaMadre.findMany({
      ...params,
      include: { cliente: { include: { persona: true } }, empleado: { include: { persona: true } } },
    });
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching Ficha Madre: ${id}`);
    const ficha = await this.prisma.fichaMadre.findUniqueOrThrow({
      where: { id },
      include: {
        cliente: { include: { persona: true } },
        empleado: { include: { persona: true } },
        inversionista: {
          include: {
            titular: true,
            domicilios: true,
            informacionLaboral: true,
            apoderado: true,
            vinculaciones: true,
            origenFondos: true,
            antecedentesPenales: true,
            residenciaFiscal: { include: { paises: { orderBy: { orden: 'asc' } } } },
            inversion: true,
          },
        },
        documentos: { include: { documentoPlantilla: true, firmas: true } },
      },
    });
    return toFichaMadreObject(ficha);
  }

  async update(id: string, dto: UpdateFichaMadreDto) {
    this.logger.log(`Updating Ficha Madre: ${id}`);
    return this.prisma.fichaMadre.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    this.logger.warn(`Deleting Ficha Madre: ${id}`);
    return this.prisma.fichaMadre.delete({ where: { id } });
  }

  async saveInversionista(id: string, dto: SaveInversionistaDto) {
    this.logger.log(`Saving inversionista data for Ficha Madre: ${id}`);

    const inversionista = await this.prisma.inversionista.upsert({
      where: { fichaMadreId: id },
      create: { fichaMadreId: id },
      update: {},
    });

    if (
      dto.es_domiciliado !== undefined ||
      dto.usar_misma_direccion_correspondencia !== undefined ||
      dto.tiene_apoderado !== undefined
    ) {
      await this.prisma.inversionista.update({
        where: { id: inversionista.id },
        data: {
          esDomiciliado: dto.es_domiciliado,
          usarMismaDireccionCorrespondencia: dto.usar_misma_direccion_correspondencia,
          tieneApoderado: dto.tiene_apoderado,
        },
      });
    }

    if (dto.titular !== undefined) {
      const titular = this.mapTitular(dto.titular);
      await this.prisma.titular.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...titular },
        update: titular,
      });
    }

    if (dto.domicilio !== undefined) {
      await this.upsertDomicilio(inversionista.id, 'DOMICILIO', dto.domicilio);
    }

    if (dto.direccion_correspondencia !== undefined) {
      await this.upsertDomicilio(inversionista.id, 'CORRESPONDENCIA', dto.direccion_correspondencia);
    }

    if (dto.informacion_laboral !== undefined) {
      const data = this.mapLaboral(dto.informacion_laboral);
      await this.prisma.informacionLaboral.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });
    }

    if (dto.apoderado !== undefined) {
      const { domicilio, poder_registral, ...ap } = dto.apoderado;
      const data = this.mapApoderado(ap, poder_registral);
      await this.prisma.apoderado.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });
      if (domicilio !== undefined) {
        await this.upsertDomicilio(inversionista.id, 'APODERADO', domicilio);
      }
    }

    if (dto.vinculaciones !== undefined) {
      const data = this.mapVinculaciones(dto.vinculaciones);
      await this.prisma.vinculaciones.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });
    }

    if (dto.origen_fondos !== undefined) {
      const data = this.mapOrigenFondos(dto.origen_fondos);
      await this.prisma.origenFondos.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });
    }

    if (dto.antecedentes_penales_judiciales !== undefined) {
      const data = this.mapAntecedentes(dto.antecedentes_penales_judiciales);
      await this.prisma.antecedentesPenales.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });
    }

    if (dto.residencia_fiscal !== undefined) {
      const data = this.mapResidenciaFiscal(dto.residencia_fiscal);
      await this.prisma.residenciaFiscal.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });

      if (dto.residencia_fiscal.paises !== undefined) {
        const rf = await this.prisma.residenciaFiscal.findUniqueOrThrow({
          where: { inversionistaId: inversionista.id },
        });
        await this.prisma.residenciaFiscalPais.deleteMany({
          where: { residenciaFiscalId: rf.id },
        });
        if (dto.residencia_fiscal.paises.length > 0) {
          await this.prisma.residenciaFiscalPais.createMany({
            data: dto.residencia_fiscal.paises.map((p, i) => ({
              residenciaFiscalId: rf.id,
              pais: p.pais ?? '',
              nitTin: p.nit_tin,
              orden: i,
            })),
          });
        }
      }
    }

    if (dto.inversion !== undefined) {
      const data = this.mapInversion(dto.inversion);
      await this.prisma.inversion.upsert({
        where: { inversionistaId: inversionista.id },
        create: { inversionistaId: inversionista.id, ...data },
        update: data,
      });
    }

    await this.prisma.fichaMadre.update({
      where: { id },
      data: { estado: 'EN_PROCESO' },
    });

    return this.findOne(id);
  }

  private async upsertDomicilio(
    inversionistaId: string,
    tipo: 'DOMICILIO' | 'CORRESPONDENCIA' | 'APODERADO',
    dto: { direccion_completa?: string; distrito?: string; provincia?: string; departamento?: string; pais_domicilio?: string; codigo_postal?: string },
  ) {
    const data = {
      tipo,
      direccionCompleta: dto.direccion_completa,
      distrito: dto.distrito,
      provincia: dto.provincia,
      departamento: dto.departamento,
      pais: dto.pais_domicilio,
      codigoPostal: dto.codigo_postal,
    };
    await this.prisma.domicilio.upsert({
      where: { uk_domicilio_inversionista_tipo: { inversionistaId, tipo } },
      create: { inversionistaId, ...data },
      update: data,
    });
  }

  private mapTitular(t: {
    nombres_apellidos?: string;
    tipo_documento?: string;
    numero_documento?: string;
    nacionalidad?: string;
    sexo?: string;
    pais_nacimiento?: string;
    departamento_nacimiento?: string;
    fecha_nacimiento?: string;
    pais_residencia?: string;
    grado_instruccion?: string;
    estado_civil?: string;
    es_inversionista?: boolean;
    correo_electronico?: string;
    telefono_celular?: string;
    conyuge?: {
      nombres_apellidos?: string;
      tipo_documento?: string;
      numero_documento?: string;
      regimen_patrimonial?: string;
      fecha_regimen?: string;
    };
    pep?: boolean;
    pep_institucion_cargo?: string;
  }) {
    return {
      nombresApellidos: t.nombres_apellidos,
      tipoDocumento: normTipoDoc(t.tipo_documento),
      numeroDocumento: t.numero_documento,
      nacionalidad: t.nacionalidad,
      sexo: t.sexo,
      paisNacimiento: t.pais_nacimiento,
      departamentoNacimiento: t.departamento_nacimiento,
      fechaNacimiento: t.fecha_nacimiento,
      paisResidencia: t.pais_residencia,
      gradoInstruccion: t.grado_instruccion,
      estadoCivil: t.estado_civil,
      esInversionista: t.es_inversionista,
      correoElectronico: t.correo_electronico,
      telefonoCelular: t.telefono_celular,
      conyugeNombresApellidos: t.conyuge?.nombres_apellidos,
      conyugeTipoDocumento: normTipoDoc(t.conyuge?.tipo_documento),
      conyugeNumeroDocumento: t.conyuge?.numero_documento,
      regimenPatrimonial: t.conyuge?.regimen_patrimonial,
      fechaRegimen: t.conyuge?.fecha_regimen,
      pep: t.pep,
      pepInstitucionCargo: t.pep_institucion_cargo,
    };
  }

  private mapLaboral(l: { situacion_laboral?: string; profesion?: string; ocupacion?: string; empresa_centro_trabajo?: string; ingreso_promedio_anual?: number | string }) {
    return {
      situacionLaboral: l.situacion_laboral,
      profesion: l.profesion,
      ocupacion: l.ocupacion,
      empresaCentroTrabajo: l.empresa_centro_trabajo,
      ingresoPromedioAnual: num(l.ingreso_promedio_anual),
    };
  }

  private mapApoderado(
    a: {
      nombres_apellidos?: string;
      tipo_documento?: string;
      numero_documento?: string;
      nacionalidad?: string;
      sexo?: string;
      estado_civil?: string;
      pais_nacimiento?: string;
      fecha_nacimiento?: string;
      pais_residencia?: string;
      grado_instruccion?: string;
      es_domiciliado?: boolean;
      correo_electronico?: string;
      telefono_celular?: string;
    },
    p?: { partida_registral?: string; asiento?: string; zona_registral?: string },
  ) {
    return {
      nombresApellidos: a.nombres_apellidos,
      tipoDocumento: normTipoDoc(a.tipo_documento),
      numeroDocumento: a.numero_documento,
      nacionalidad: a.nacionalidad,
      sexo: a.sexo,
      estadoCivil: a.estado_civil,
      paisNacimiento: a.pais_nacimiento,
      fechaNacimiento: a.fecha_nacimiento,
      paisResidencia: a.pais_residencia,
      gradoInstruccion: a.grado_instruccion,
      esDomiciliado: a.es_domiciliado,
      correoElectronico: a.correo_electronico,
      telefonoCelular: a.telefono_celular,
      partidaRegistral: p?.partida_registral,
      asiento: p?.asiento,
      zonaRegistral: p?.zona_registral,
    };
  }

  private mapVinculaciones(v: { es_vinculado_corfid_grupo_coril?: boolean; ha_sido_cliente_otra_fiduciaria?: boolean; ha_sido_trabajador_otra_fiduciaria?: boolean; valor_aproximado_patrimonio?: number | string }) {
    return {
      esVinculadoCorfidGrupoCoril: v.es_vinculado_corfid_grupo_coril,
      haSidoClienteOtraFiduciaria: v.ha_sido_cliente_otra_fiduciaria,
      haSidoTrabajadorOtraFiduciaria: v.ha_sido_trabajador_otra_fiduciaria,
      valorAproximadoPatrimonio: num(v.valor_aproximado_patrimonio),
    };
  }

  private mapOrigenFondos(o: {
    fondos_propios_detalle?: string;
    venta_activos_detalle?: string;
    financiamientos_detalle?: string;
    dividendos_participaciones_detalle?: string;
    contrato_obra_licitacion_detalle?: string;
    patrimonio_fideicometido_detalle?: string;
    otros_fondos_detalle?: string;
  }) {
    return {
      fondosPropiosDetalle: o.fondos_propios_detalle,
      ventaActivosDetalle: o.venta_activos_detalle,
      financiamientosDetalle: o.financiamientos_detalle,
      dividendosParticipacionesDetalle: o.dividendos_participaciones_detalle,
      contratoObraLicitacionDetalle: o.contrato_obra_licitacion_detalle,
      patrimonioFideicometidoDetalle: o.patrimonio_fideicometido_detalle,
      otrosFondosDetalle: o.otros_fondos_detalle,
    };
  }

  private mapAntecedentes(a: { es_investigado_delitos?: boolean; especificar_delitos?: string }) {
    return {
      esInvestigadoDelitos: a.es_investigado_delitos,
      especificarDelitos: a.especificar_delitos,
    };
  }

  private mapResidenciaFiscal(r: { tiene_residencia_fiscal_extranjera?: boolean }) {
    return {
      tieneResidenciaFiscalExtranjera: r.tiene_residencia_fiscal_extranjera,
    };
  }

  private mapInversion(i: { moneda?: string; monto_inicial?: number | string; monto_inicial_letras?: string; origen_recursos?: string; banco_nombre?: string; numero_cuenta?: string; cuenta_cci?: string }) {
    return {
      moneda: i.moneda,
      montoInicial: num(i.monto_inicial),
      montoInicialLetras: i.monto_inicial_letras,
      origenRecursos: i.origen_recursos,
      bancoNombre: i.banco_nombre,
      numeroCuenta: i.numero_cuenta,
      cuentaCci: i.cuenta_cci,
    };
  }

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
}