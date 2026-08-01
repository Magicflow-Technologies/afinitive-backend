import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service.js';
import { CreateDocumentoGeneralDto } from './dto/create-documento-general.dto.js';
import { UpdateDocumentoGeneralDto } from './dto/update-documento-general.dto.js';
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { chromium } from 'playwright';

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
  '01_carta_solicitud_participacion.hbs': 5,
  '03_formato_beneficiario_final.hbs': 4,
  '04_dj_residencia_fiscal.hbs': 3,
  '05_ficha_cliente_pn.hbs': 1,
};

@Injectable()
export class DocumentoGeneralService {
  constructor(private readonly prisma: PrismaService) {}

  private getArchivoFromItem(item?: { archivo?: string | null; documentoPlantilla?: { archivo?: string | null } | null } | null) {
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

  private sortDocumentosByTemplateOrder<T extends { archivo?: string | null; documentoPlantilla?: { archivo?: string | null } | null; createdAt?: Date | string | null }>(
    documentos: T[],
  ) {
    return [...documentos].sort((a, b) => {
      const orderDiff = this.getTemplateOrder(this.getArchivoFromItem(a)) - this.getTemplateOrder(this.getArchivoFromItem(b));

      if (orderDiff !== 0) {
        return orderDiff;
      }

      const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdAtA - createdAtB;
    });
  }

  async create(dto: CreateDocumentoGeneralDto) {
    return this.prisma.documentoGeneral.create({ data: dto, include: { documentoPlantilla: true } });
  }

  async findByFichaMadre(fichaMadreId: string) {
    const documentos = await this.prisma.documentoGeneral.findMany({
      where: { fichaMadreId },
      include: { documentoPlantilla: true, firmas: true },
    });

    return this.sortDocumentosByTemplateOrder(documentos);
  }

  async findOne(id: string) {
    return this.prisma.documentoGeneral.findUniqueOrThrow({ where: { id }, include: { documentoPlantilla: true, firmas: true, fichaMadre: true } });
  }

  async update(id: string, dto: UpdateDocumentoGeneralDto) {
    return this.prisma.documentoGeneral.update({ where: { id }, data: dto });
  }

  async generate(fichaMadreId: string) {
    // 1. Obtener la Ficha Madre con el cliente y sus respuestas
    const fichaMadre = await this.prisma.fichaMadre.findUniqueOrThrow({
      where: { id: fichaMadreId },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
        fichasFormulario: {
          include: {
            respuestas: {
              include: {
                campoFormulario: true,
              },
            },
          },
        },
      },
    });

    // 2. Construir diccionario de respuestas
    const answers: Record<string, string> = {};
    for (const ff of fichaMadre.fichasFormulario) {
      for (const resp of ff.respuestas) {
        answers[resp.campoFormulario.nombre] = resp.valor;
      }
    }

    const persona = fichaMadre.cliente.persona;
    
    // Formatear fecha actual
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const hoy = new Date();
    const fechaActualStr = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

    // Cargar logo Corfid en base64
    let logoBase64 = '';
    try {
      const logoPath = path.join(process.cwd(), 'hbs', 'corfid_logo.png');
      const buffer = await fs.readFile(logoPath);
      logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.error('Error al leer corfid_logo.png:', e);
    }

    const val = (key: string, def = '') => answers[key] || def;
    const isVal = (key: string, target: string) => val(key).toLowerCase() === target.toLowerCase() ? 'X' : ' ';

    // Formatear monto
    const monto = val('monto_inicial_invertir');
    const montoNum = parseFloat(monto) || 0;
    const montoFormateado = montoNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Armar el objeto de reemplazos para Handlebars
    const replacements = {
      fecha_actual: fechaActualStr,
      dia: String(hoy.getDate()),
      logo_corfid: logoBase64,

      nombres_apellidos: `${persona.nombres} ${persona.apellidos}`.trim(),
      tipo_documento: persona.tipoDocumento,
      numero_documento: persona.numeroDocumento,
      telefono_celular: val('telefono_contacto', ''),
      correo_electronico: persona.correo,
      estado_civil: val('estado_civil', ''),
      nacionalidad: val('nacionalidad', ''),
      pais_nacimiento: val('pais_nacimiento', ''),
      fecha_nacimiento: val('fecha_nacimiento', ''),
      profesion: val('profesion', ''),
      ocupacion: val('ocupacion', ''),
      grado_instruccion: val('grado_instruccion', ''),
      empresa_centro_trabajo: val('empresa_centro_trabajo', ''),

      direccion_completa: val('direccion_completa', ''),
      distrito: val('distrito', ''),
      provincia: val('provincia', ''),
      departamento: val('departamento', ''),
      pais_residencia: val('pais_residencia', ''),
      codigo_postal: val('codigo_postal', ''),
      direccion_completa_formato: `${val('direccion_completa')}, ${val('distrito')}, ${val('provincia')}, ${val('departamento')}`,

      banco_nombre: val('banco_nombre', ''),
      numero_cuenta: val('numero_cuenta', ''),
      cuenta_cci: val('cuenta_cci', ''),
      detalle_origen_fondos: val('detalle_origen_fondos', ''),
      monto_inicial_invertir_formateado: montoFormateado,
      moneda_simbolo: '$',

      doc_dni: persona.tipoDocumento === 'DNI' ? persona.numeroDocumento : '',
      doc_ruc: persona.tipoDocumento === 'RUC' ? persona.numeroDocumento : '',
      doc_ce: persona.tipoDocumento === 'CE' ? persona.numeroDocumento : '',
      doc_pasaporte: persona.tipoDocumento === 'PASAPORTE' ? persona.numeroDocumento : '',
      doc_nit: '',

      es_soltero: isVal('estado_civil', 'soltero/a'),
      es_casado: isVal('estado_civil', 'casado/a'),
      es_conviviente: isVal('estado_civil', 'conviviente'),
      es_divorciado: isVal('estado_civil', 'divorciado/a'),
      es_viudo: isVal('estado_civil', 'viudo/a'),

      pep_si: isVal('es_pep', 'sí'),
      pep_institucion_cargo: val('pep_institucion_cargo', ''),

      residencia_fiscal_fuera_si: isVal('residencia_fiscal_fuera', 'sí'),
      residencia_fiscal_fuera_no: isVal('residencia_fiscal_fuera', 'no'),
      pais_residencia_fiscal_extranjero: val('pais_residencia_fiscal_extranjero', ''),

      conyuge_nombres_apellidos: val('conyuge_nombres_apellidos', ''),
      conyuge_tipo_documento: val('conyuge_tipo_documento', ''),
      conyuge_numero_documento: val('conyuge_numero_documento', ''),
      conyuge_fecha_matrimonio: val('conyuge_fecha_matrimonio', ''),
      regimen_gananciales: isVal('regimen_patrimonial', 'gananciales'),
      regimen_separacion: isVal('regimen_patrimonial', 'separación de patrimonios'),
      
      conyuge_doc_dni: val('conyuge_tipo_documento') === 'DNI' ? val('conyuge_numero_documento') : '',
      conyuge_doc_ce: val('conyuge_tipo_documento') === 'CE' ? val('conyuge_numero_documento') : '',
      conyuge_doc_pasaporte: val('conyuge_tipo_documento') === 'PASAPORTE' ? val('conyuge_numero_documento') : '',
    };

    // 3. Limpiar firmas y documentos anteriores para esta Ficha Madre
    const docsAnteriores = await this.prisma.documentoGeneral.findMany({ where: { fichaMadreId } });
    for (const docAnt of docsAnteriores) {
      await this.prisma.firma.deleteMany({ where: { documentoGeneralId: docAnt.id } });
      await this.prisma.documentoGeneral.delete({ where: { id: docAnt.id } });
    }

    // 4. Cargar todas las plantillas activas
    const plantillas = this.sortDocumentosByTemplateOrder(
      await this.prisma.documentoPlantilla.findMany({ where: { activo: true } }),
    );
    const documentosGenerados: any[] = [];

    // Crear la carpeta pública si no existe
    const baseOutputDir = path.join(process.cwd(), 'public', 'documents', fichaMadreId);
    await fs.mkdir(baseOutputDir, { recursive: true });

    for (const plantilla of plantillas) {
      try {
        // Leer la plantilla HBS usando compatibilidad con nombres legacy del repositorio
        const templatePath = await this.resolveTemplatePath(plantilla.archivo);
        const templateContent = await fs.readFile(templatePath, 'utf-8');

        // Compilar con Handlebars
        const compiledHtml = Handlebars.compile(templateContent)(replacements);

        // Guardar archivo HTML compilado en public
        const outputFileName = plantilla.archivo.replace('.hbs', '.html');
        const outputPath = path.join(baseOutputDir, outputFileName);
        await fs.writeFile(outputPath, compiledHtml, 'utf-8');

        const relativeUrl = `/documents/${fichaMadreId}/${outputFileName}`;

        // Registrar en base de datos
        const docGen = await this.prisma.documentoGeneral.create({
          data: {
            fichaMadreId,
            documentoPlantillaId: plantilla.id,
            nombreArchivo: plantilla.nombre,
            rutaArchivo: relativeUrl,
            estado: 'PENDIENTE_FIRMA',
          },
          include: { documentoPlantilla: true },
        });

        // Crear registro de Firma
        await this.prisma.firma.create({
          data: {
            documentoGeneralId: docGen.id,
            tipo: 'ELECTRONICA',
            estado: 'PENDIENTE',
          }
        });

        documentosGenerados.push(docGen);
      } catch (err) {
        console.error(`Error al procesar plantilla ${plantilla.nombre}:`, err);
      }
    }

    // Actualizar estado de la Ficha Madre a EN_REVISION
    await this.prisma.fichaMadre.update({
      where: { id: fichaMadreId },
      data: { estado: 'EN_REVISION' },
    });

    return documentosGenerados;
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

  async generatePdfPrimerosCinco(fichaMadreId: string) {
    const documentos = await this.prisma.documentoGeneral.findMany({
      where: { fichaMadreId },
      include: { documentoPlantilla: true },
    });

    const seleccionados = this.sortDocumentosByTemplateOrder(documentos).slice(0, 5);
    if (seleccionados.length < 5) {
      throw new BadRequestException('La ficha no tiene al menos cinco formatos generados.');
    }

    const htmls: string[] = [];
    for (const doc of seleccionados) {
      const physicalPath = path.join(process.cwd(), 'public', doc.rutaArchivo);
      htmls.push(await fs.readFile(physicalPath, 'utf-8'));
    }

    const pdfBuffer = await this.renderHtmlsToPdf(htmls);
    return pdfBuffer;
  }

  private async renderHtmlsToPdf(htmls: string[]): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const page = await browser.newPage({
        viewport: { width: 1240, height: 1754 },
      });

      const wrapperHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: Arial, sans-serif; }
      .sheet { width: 210mm; min-height: 297mm; break-after: page; overflow: hidden; }
      .sheet:last-child { break-after: auto; }
      iframe { width: 210mm; height: 297mm; border: 0; display: block; }
    </style>
  </head>
  <body>
    ${htmls
      .map(
        (html) =>
          `<section class="sheet"><iframe srcdoc="${this.escapeForAttribute(html)}"></iframe></section>`,
      )
      .join('')}
  </body>
</html>`;

      await page.setContent(wrapperHtml, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });

      await page.close();
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private escapeForAttribute(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async getPreview(id: string) {
    const doc = await this.findOne(id);
    const physicalPath = path.join(process.cwd(), 'public', doc.rutaArchivo);
    try {
      return await fs.readFile(physicalPath, 'utf-8');
    } catch (e) {
      throw new Error(`No se pudo leer el archivo de previsualización del documento en la ruta: ${physicalPath}`);
    }
  }

  async remove(id: string) {
    return this.prisma.documentoGeneral.delete({ where: { id } });
  }
}
