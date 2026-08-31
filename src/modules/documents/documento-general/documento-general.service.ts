import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateDocumentoGeneralDto } from './dto/create-documento-general.dto.js';
import { UpdateDocumentoGeneralDto } from './dto/update-documento-general.dto.js';
import { toFichaMadreObject } from '../../onboarding/ficha-madre/ficha-madre.mapper.js';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const TEMPLATE_FILE_FALLBACKS: Record<string, string> = {
  '01_carta_solicitud_participacion.hbs': '05_carta_solicitud_participacion.hbs',
  '03_formato_beneficiario_final.hbs': '04_formato_beneficiario_final.hbs',
  '04_dj_residencia_fiscal.hbs': '03_dj_residencia_fiscal.hbs',
  '05_ficha_cliente_pn.hbs': '01_ficha_cliente_pn.hbs',
};

const TEMPLATE_DISPLAY_ORDER: Record<string, number> = {
  '01_ficha_cliente_pn.hbs': 1,
  '02_dj_titularidad_flujos.hbs': 2,
  '03_dj_residencia_fiscal.hbs': 3,
  '04_formato_beneficiario_final.hbs': 4,
  '05_carta_solicitud_participacion.hbs': 5,
  '06_instruccion_inversion.hbs': 6,
  '07_declaracion_inversion.hbs': 7,
};

@Injectable()
export class DocumentoGeneralService {
  constructor(private readonly prisma: PrismaService) {}

  private getArchivoFromItem(
    item?: {
      archivo?: string | null;
      documentoPlantilla?: { archivo?: string | null } | null;
    } | null,
  ) {
    return item?.archivo ?? item?.documentoPlantilla?.archivo ?? '';
  }

  private getCanonicalTemplateArchivo(archivo?: string | null) {
    if (!archivo) {
      return '';
    }
    return TEMPLATE_FILE_FALLBACKS[archivo] ?? archivo;
  }

  private getTemplateOrder(archivo?: string | null) {
    const canonicalArchivo = this.getCanonicalTemplateArchivo(archivo);
    return TEMPLATE_DISPLAY_ORDER[canonicalArchivo] ?? Number.MAX_SAFE_INTEGER;
  }

  private sortDocumentosByTemplateOrder<
    T extends {
      archivo?: string | null;
      documentoPlantilla?: { archivo?: string | null } | null;
      createdAt?: Date | string | null;
    },
  >(documentos: T[]) {
    return [...documentos].sort((a, b) => {
      const orderDiff =
        this.getTemplateOrder(this.getArchivoFromItem(a)) -
        this.getTemplateOrder(this.getArchivoFromItem(b));

      if (orderDiff !== 0) {
        return orderDiff;
      }

      const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdAtA - createdAtB;
    });
  }

  async create(dto: CreateDocumentoGeneralDto) {
    return this.prisma.documentoGeneral.create({
      data: dto,
      include: { documentoPlantilla: true },
    });
  }

  async findByFichaMadre(fichaMadreId: string) {
    const documentos = await this.prisma.documentoGeneral.findMany({
      where: { fichaMadreId },
      include: { documentoPlantilla: true, firmas: true },
    });

    return this.sortDocumentosByTemplateOrder(documentos);
  }

  async findOne(id: string) {
    return this.prisma.documentoGeneral.findUniqueOrThrow({
      where: { id },
      include: { documentoPlantilla: true, firmas: true, fichaMadre: true },
    });
  }

  async update(id: string, dto: UpdateDocumentoGeneralDto) {
    return this.prisma.documentoGeneral.update({ where: { id }, data: dto });
  }

  async generate(fichaMadreId: string) {
    const fichaMadre = await this.loadFichaMadreConData(fichaMadreId);
    const replacements = await this.buildReplacements(fichaMadre);

    const docsAnteriores = await this.prisma.documentoGeneral.findMany({
      where: { fichaMadreId },
    });
    for (const docAnt of docsAnteriores) {
      await this.prisma.tokenAccesoDocumento.deleteMany({
        where: { documentoGeneralId: docAnt.id },
      });
      await this.prisma.firma.deleteMany({
        where: { documentoGeneralId: docAnt.id },
      });
      await this.prisma.documentoGeneral.delete({ where: { id: docAnt.id } });
    }

    const plantillas = this.sortDocumentosByTemplateOrder(
      await this.prisma.documentoPlantilla.findMany({
        where: { activo: true },
      }),
    );
    const documentosGenerados: any[] = [];

    for (const plantilla of plantillas) {
      try {
        const templatePath = await this.resolveTemplatePath(plantilla.archivo);
        const templateContent = await fs.readFile(templatePath, 'utf-8');

        Handlebars.compile(templateContent)(replacements);

        const docGen = await this.prisma.documentoGeneral.create({
          data: {
            fichaMadreId,
            documentoPlantillaId: plantilla.id,
            nombreArchivo: plantilla.nombre,
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

        documentosGenerados.push(docGen);
      } catch (err) {
        console.error(`Error al procesar plantilla ${plantilla.nombre}:`, err);
      }
    }

    await this.prisma.fichaMadre.update({
      where: { id: fichaMadreId },
      data: { estado: 'EN_REVISION' },
    });

    return documentosGenerados;
  }

  private async loadFichaMadreConData(fichaMadreId: string) {
    return this.prisma.fichaMadre.findUniqueOrThrow({
      where: { id: fichaMadreId },
      include: {
        cliente: { include: { persona: true } },
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
        documentos: {
          include: {
            firmas: true,
          },
        },
      },
    });
  }

  private async buildReplacements(fichaMadre: any, currentDoc?: any) {
    const fm = toFichaMadreObject(fichaMadre);
    const inv = fm.fichaMadre.inversionista ?? {};
    const titular = inv.titular ?? {};
    const domicilio = inv.domicilio ?? {};
    const laboral = inv.informacion_laboral ?? {};
    const conyuge = titular.conyuge ?? {};
    const inversion = inv.inversion ?? {};
    const residencia = inv.residencia_fiscal ?? {};
    const apoderado = inv.apoderado ?? {};

    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const hoy = new Date();
    const fechaActualStr = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

    // Buscar si existe firma realizada EXCLUSIVAMENTE en este documento específico
    let firmaImagen = '';
    let estaFirmado = false;
    let fechaFirmaStr = '';

    if (currentDoc) {
      const docFirmas = currentDoc.firmas || [];
      const firmaFirmada = docFirmas.find(
        (f: any) => f.estado === 'FIRMADO' && f.datosCertificado?.firmaImagen,
      );
      if (firmaFirmada) {
        estaFirmado = true;
        firmaImagen = firmaFirmada.datosCertificado.firmaImagen;
        if (firmaFirmada.fechaFirma) {
          const ff = new Date(firmaFirmada.fechaFirma);
          fechaFirmaStr = `${ff.getDate()} de ${meses[ff.getMonth()]} de ${ff.getFullYear()}`;
        }
      }
    }

    if (!fm.fichaMadre.metadata) {
      fm.fichaMadre.metadata = {};
    }
    fm.fichaMadre.metadata.firmado = estaFirmado;
    fm.fichaMadre.metadata.firma_imagen = firmaImagen;

    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'hbs', 'corfid_logo.png');
      const buffer = await fs.readFile(logoPath);
      logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.error('Error al leer corfid_logo.png:', e);
    }

    const estadoCivil = (titular.estado_civil ?? '').toLowerCase();
    const tipoDoc = (titular.tipo_documento ?? '').toUpperCase();
    const conyugeTipoDoc = (conyuge.tipo_documento ?? '').toUpperCase();

    const isVal = (v: any, target: string) =>
      String(v ?? '').toLowerCase() === target ? 'X' : ' ';

    const montoNum = parseFloat(inversion.monto_inicial) || 0;
    const montoFormateado = montoNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const paisesFiscales = residencia.paises ?? [];

    return {
      fichaMadre: fm.fichaMadre,

      // Estado de firma
      firmado: estaFirmado,
      firma_imagen: firmaImagen,
      fecha_firma: fechaFirmaStr || fechaActualStr,

      // Fechas y recursos
      fecha_actual: fechaActualStr,
      dia: String(hoy.getDate()),
      mes: String(hoy.getMonth() + 1).padStart(2, '0'),
      anio: String(hoy.getFullYear()),
      logo_corfid: logoBase64,

      // Aliases planos (compatibilidad con las plantillas)
      nombres_apellidos: titular.nombres_apellidos ?? '',
      nombresApellidos: titular.nombres_apellidos ?? '',
      tipo_documento: titular.tipo_documento ?? '',
      numero_documento: titular.numero_documento ?? '',
      numeroDocumento: titular.numero_documento ?? '',
      correo_electronico: titular.correo_electronico ?? '',
      telefono_celular: titular.telefono_celular ?? '',
      estado_civil: titular.estado_civil ?? '',
      nacionalidad: titular.nacionalidad ?? '',
      pais_nacimiento: titular.pais_nacimiento ?? '',
      fecha_nacimiento: titular.fecha_nacimiento ?? '',
      sexo: titular.sexo ?? '',
      grado_instruccion: titular.grado_instruccion ?? '',
      es_inversionista: titular.es_inversionista ?? false,
      pep: titular.pep ?? false,
      pep_institucion_cargo: titular.pep_institucion_cargo ?? '',

      situacion_laboral: laboral.situacion_laboral ?? '',
      profesion: laboral.profesion ?? '',
      ocupacion: laboral.ocupacion ?? '',
      empresa_centro_trabajo: laboral.empresa_centro_trabajo ?? '',
      ingreso_promedio_anual: laboral.ingreso_promedio_anual ?? '',

      direccion_completa: domicilio.direccion_completa ?? '',
      distrito: domicilio.distrito ?? '',
      provincia: domicilio.provincia ?? '',
      departamento: domicilio.departamento ?? '',
      pais_residencia: titular.pais_residencia ?? '',
      codigo_postal: domicilio.codigo_postal ?? '',
      es_domiciliado: inv.es_domiciliado ?? false,

      // Documento de identidad
      doc_dni: tipoDoc === 'DNI' ? titular.numero_documento ?? '' : '',
      doc_ruc: tipoDoc === 'RUC' ? titular.numero_documento ?? '' : '',
      doc_ce: tipoDoc === 'CE' ? titular.numero_documento ?? '' : '',
      doc_pasaporte: tipoDoc === 'PASAPORTE' ? titular.numero_documento ?? '' : '',
      es_dni: tipoDoc === 'DNI',
      es_ce: tipoDoc === 'CE',
      es_pasaporte: tipoDoc === 'PASAPORTE',
      doc_nit: '',

      // Estado civil
      es_soltero: isVal(estadoCivil, 'soltero'),
      es_casado: isVal(estadoCivil, 'casado'),
      es_conviviente: isVal(estadoCivil, 'conviviente'),
      es_divorciado: isVal(estadoCivil, 'divorciado'),
      es_viudo: isVal(estadoCivil, 'viudo'),

      // Cónyuge y régimen
      conyuge_nombres_apellidos: conyuge.nombres_apellidos ?? '',
      conyuge_tipo_documento: conyuge.tipo_documento ?? '',
      conyuge_numero_documento: conyuge.numero_documento ?? '',
      conyuge_fecha_matrimonio: conyuge.fecha_regimen ?? '',
      conyuge_doc_dni: conyugeTipoDoc === 'DNI' ? conyuge.numero_documento ?? '' : '',
      conyuge_doc_ce: conyugeTipoDoc === 'CE' ? conyuge.numero_documento ?? '' : '',
      conyuge_doc_pasaporte: conyugeTipoDoc === 'PASAPORTE' ? conyuge.numero_documento ?? '' : '',
      regimen_gananciales: isVal(conyuge.regimen_patrimonial, 'gananciales'),
      regimen_separacion: isVal(conyuge.regimen_patrimonial, 'separacion'),
      regimen_union_hecho: isVal(conyuge.regimen_patrimonial, 'union'),
      regimen_fecha: conyuge.fecha_regimen ?? '',

      // Residencia fiscal
      tiene_residencia_fiscal_extranjera: residencia.tiene_residencia_fiscal_extranjera ?? false,
      residencia_fiscal_fuera: residencia.tiene_residencia_fiscal_extranjera ?? false,
      pais_residencia_fiscal_extranjero: paisesFiscales[0]?.pais ?? '',
      pais_residencia_fiscal_extranjero_2: paisesFiscales[1]?.pais ?? '',
      pais_residencia_fiscal_extranjero_3: paisesFiscales[2]?.pais ?? '',
      doc_nit_2: paisesFiscales[1]?.nit_tin ?? '',
      doc_nit_3: paisesFiscales[2]?.nit_tin ?? '',

      // Apoderado
      apoderado_nombres_apellidos: apoderado.nombres_apellidos ?? '',
      apoderado_tipo_documento: apoderado.tipo_documento ?? '',
      apoderado_numero_documento: apoderado.numero_documento ?? '',
      apoderado_nacionalidad: apoderado.nacionalidad ?? '',
      apoderado_sexo: apoderado.sexo ?? '',
      apoderado_estado_civil: apoderado.estado_civil ?? '',
      apoderado_pais_nacimiento: apoderado.pais_nacimiento ?? '',
      apoderado_fecha_nacimiento: apoderado.fecha_nacimiento ?? '',
      apoderado_pais_residencia: apoderado.pais_residencia ?? '',
      apoderado_grado_instruccion: apoderado.grado_instruccion ?? '',
      apoderado_es_domiciliado: apoderado.es_domiciliado ?? false,
      apoderado_correo_electronico: apoderado.correo_electronico ?? '',
      apoderado_telefono_celular: apoderado.telefono_celular ?? '',
      apoderado_distrito: apoderado.domicilio?.distrito ?? '',
      apoderado_departamento: apoderado.domicilio?.departamento ?? '',
      apoderado_provincia: apoderado.domicilio?.provincia ?? '',
      apoderado_pais_domicilio: apoderado.domicilio?.pais_domicilio ?? '',
      apoderado_direccion_completa: apoderado.domicilio?.direccion_completa ?? '',
      apoderado_email: apoderado.correo_electronico ?? '',

      // Inversión y datos bancarios
      moneda: inversion.moneda ?? '',
      moneda_simbolo: (inversion.moneda ?? 'USD').toUpperCase() === 'USD' ? '$' : 'S/',
      monto_inicial: inversion.monto_inicial ?? '',
      monto_inicial_invertir_formateado: montoFormateado,
      monto_inicial_letras: inversion.monto_inicial_letras ?? '',
      monto_en_letras: inversion.monto_inicial_letras ?? '',
      origen_recursos: inversion.origen_recursos ?? '',
      banco_nombre: inversion.banco_nombre ?? '',
      numero_cuenta: inversion.numero_cuenta ?? '',
      cuenta_cci: inversion.cuenta_cci ?? '',

      // Datos del contrato / fideicomiso (configurables)
      fecha_contrato: '27 de febrero 2024',
      empresa_interviniente: 'Inversiones Condominio Aventura S.A.C.',
      interviniente_nombre: 'AFINITIVE S.A.C.',
      representante_inversionistas_nombre: 'RICARDO MARTIN BERTALMIO RUIBAL',
      representante_inversionistas_dni: '07636192',
      moneda_nombre: 'dólares americanos',
      titular_cuenta_nombre:
        'Patrimonio en Fideicomiso PF AFINITIVE -D. LEG. N° 861, Titulo XI, No Inscrito en la SMV, Dirigido a Inversionistas Institucionales.',
      titular_cuenta_ruc: '20609876543',
      patrimonio_nombre: 'Patrimonio en Fideicomiso AFINITIVE',
      patrimonio_nombre_largo:
        'Patrimonio en Fideicomiso AFINITIVE – D. Leg. N° 861, No Inscrito en la SMV, Dirigido a Inversionistas Institucionales.',
      patrimonio_sigla: 'PF AFINITIVE',
      fideicomiso_nombre: 'AWM LIBRE 2',
      fideicomiso_patrimonio_nombre: 'Fideicomiso AFINITIVE',
      fideicomitente_nombre: 'AFINITIVE S.A.C.',
      notario_nombre: 'Notario Público de Lima Dr. Eduardo Laos de Lama',
      cantidad_valores: 'Uno (01)',
      serie_emision: 'Primera',
      tasa_interes: '10 %',
      plazo_emision: 'Hasta de 24 meses. Base ACT/360.',
      vigencia_instruccion: 'Seis (06) días hábiles',
    };
  }

  private async resolveTemplatePath(archivo: string) {
    const baseDir = path.join(process.cwd(), 'hbs');
    const exactPath = path.join(baseDir, archivo);

    try {
      await fs.access(exactPath);
      return exactPath;
    } catch {
      const fallbackArchivo = TEMPLATE_FILE_FALLBACKS[archivo];
      if (fallbackArchivo) {
        const fallbackPath = path.join(baseDir, fallbackArchivo);
        await fs.access(fallbackPath);
        return fallbackPath;
      }

      throw new Error(`No se encontró la plantilla HBS para ${archivo}`);
    }
  }

  private async renderPlantillaHtml(archivo: string, context: any) {
    const templatePath = await this.resolveTemplatePath(archivo);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    return Handlebars.compile(templateContent)(context);
  }

  async generatePdfPrimerosCinco(fichaMadreId: string) {
    const documentos = await this.prisma.documentoGeneral.findMany({
      where: { fichaMadreId },
      include: { documentoPlantilla: true, firmas: true },
    });

    const seleccionados = this.sortDocumentosByTemplateOrder(documentos).slice(0, 5);
    if (seleccionados.length < 5) {
      throw new BadRequestException(
        'La ficha no tiene al menos cinco formatos generados.',
      );
    }

    const fichaMadre = await this.loadFichaMadreConData(fichaMadreId);

    const htmls: string[] = [];
    for (const doc of seleccionados) {
      const archivo = doc.documentoPlantilla?.archivo;
      if (!archivo) {
        throw new BadRequestException(
          `El documento ${doc.nombreArchivo} no tiene una plantilla asociada.`,
        );
      }
      const replacements = await this.buildReplacements(fichaMadre, doc);
      htmls.push(await this.renderPlantillaHtml(archivo, replacements));
    }

    return this.renderHtmlsToPdf(htmls);
  }

  private async renderHtmlsToPdf(htmls: string[]): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage({
        viewport: { width: 1240, height: 1754 },
      });

      const pdfBuffers: Buffer[] = [];

      for (const html of htmls) {
        await page.setContent(html, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        const singlePdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
          margin: {
            top: '0mm',
            right: '0mm',
            bottom: '0mm',
            left: '0mm',
          },
        });
        pdfBuffers.push(Buffer.from(singlePdf));
      }

      await page.close();

      if (pdfBuffers.length === 1) {
        return pdfBuffers[0];
      }

      const mergedPdf = await PDFDocument.create();
      for (const buffer of pdfBuffers) {
        const doc = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }

      const finalPdfBytes = await mergedPdf.save();
      return Buffer.from(finalPdfBytes);
    } finally {
      await browser.close();
    }
  }

  async getPreview(id: string) {
    const doc = await this.findOne(id);

    const archivo = doc.documentoPlantilla?.archivo;
    if (!archivo) {
      throw new Error('El documento no tiene una plantilla asociada para previsualizar.');
    }

    const fichaMadre = await this.loadFichaMadreConData(doc.fichaMadreId);
    const replacements = await this.buildReplacements(fichaMadre, doc);

    return this.renderPlantillaHtml(archivo, replacements);
  }

  async remove(id: string) {
    return this.prisma.documentoGeneral.delete({ where: { id } });
  }
}