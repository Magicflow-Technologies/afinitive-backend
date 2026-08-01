import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import { Writable } from 'stream';

function getArchiverInstance(format: string, options: any) {
  const lib = require('archiver');
  if (typeof lib === 'function') {
    return lib(format, options);
  }
  if (typeof lib?.default === 'function') {
    return lib.default(format, options);
  }
  if (typeof lib?.create === 'function') {
    return lib.create(format, options);
  }
  if (lib?.ZipArchive && format === 'zip') {
    return new lib.ZipArchive(options);
  }
  if (lib?.Archiver) {
    return new lib.Archiver(format, options);
  }
  throw new Error(`No se pudo inicializar la librería archiver.`);
}

// Registrar helper de Handlebars para índices basados en 1
Handlebars.registerHelper('addOne', (index: number) => index + 1);

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Genera los formatos fiduciarios (CORFID y CORIL) autocompletados
   * en formato PDF mediante HTML5 + Handlebars + Puppeteer y los empaqueta en .ZIP.
   */
  async generarFormatosZip(clienteId: string): Promise<Buffer> {
    this.logger.log(`Iniciando generación de formatos PDF para el cliente: ${clienteId}`);

    let clienteData: any = {};

    try {
      const client = this.supabaseService.getClient();
      const { data: clienteList } = await client
        .from('ficha_madre')
        .select('*')
        .or(`id.eq.${clienteId},usuario_id.eq.${clienteId}`);

      if (clienteList && clienteList.length > 0) {
        clienteData = clienteList[0];
        const { data: beneficiariosList } = await client
          .from('beneficiarios')
          .select('*')
          .eq('ficha_id', clienteData.id);
        clienteData.beneficiarios = beneficiariosList || [];
      }
    } catch (err: any) {
      this.logger.warn(`Error al consultar cliente ${clienteId}: ${err?.message}`);
    }

    return this.generarFormatosDirectosZip(clienteData);
  }

  /**
   * Genera el paquete ZIP con los 7 formatos fiduciarios PDF vectoriales directamente desde los datos enviados en la UI
   */
  async generarFormatosDirectosZip(clienteData: any): Promise<Buffer> {
    this.logger.log('Generando paquete ZIP de los 7 formatos fiduciarios directamente desde datos en vivo...');

    const hbsDir = path.join(process.cwd(), 'templates', 'hbs');
    const pathCarta = path.join(hbsDir, '01_carta_solicitud_participacion.hbs');
    const pathDJFlujos = path.join(hbsDir, '02_dj_titularidad_flujos.hbs');
    const pathBeneficiario = path.join(hbsDir, '03_formato_beneficiario_final.hbs');
    const pathDJResidencia = path.join(hbsDir, '04_dj_residencia_fiscal.hbs');
    const pathFichaCliente = path.join(hbsDir, '05_ficha_cliente_pn.hbs');
    const pathInstruccion = path.join(hbsDir, '06_instruccion_inversion.hbs');
    const pathDeclaracion = path.join(hbsDir, '07_declaracion_inversion.hbs');

    const logoPath = path.join(hbsDir, 'corfid_logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
      logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }

    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const fechaActualEs = new Date().toLocaleDateString('es-ES', dateOptions);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mesNombre = meses[new Date().getMonth()];

    const variablesData = {
      logo_corfid: logoBase64,
      nombres_apellidos: clienteData.nombres_apellidos || 'Fernanda Novoa Vásquez',
      tipo_documento: clienteData.tipo_documento || 'DNI',
      numero_documento: clienteData.numero_documento || '72387643',
      nro_identificacion_fiscal: clienteData.numero_identificacion_fiscal || '10723876431',
      correo_electronico: clienteData.correo_electronico || 'inversionista@afinitive.pe',
      telefono_celular: clienteData.telefono_celular || '987654321',
      fecha_nacimiento: clienteData.fecha_nacimiento || '2002-09-11',
      pais_nacimiento: clienteData.pais_nacimiento || 'Perú',
      nacionalidad: clienteData.nacionalidad || 'Peruana',
      estado_civil: clienteData.estado_civil || 'Soltero',
      grado_instruccion: clienteData.grado_instruccion || 'Superior Completo',
      direccion_completa: clienteData.direccion_completa || 'Jirón Durero 499, Dpto. 102',
      distrito: clienteData.distrito || 'San Borja',
      provincia: clienteData.provincia || 'Lima',
      departamento: clienteData.departamento || 'Lima',
      codigo_postal: clienteData.codigo_postal || '15037',
      pais_residencia: clienteData.pais_residencia || 'Perú',
      cuenta_cci: clienteData.cuenta_cci || '00219300987654320112',
      numero_cuenta: clienteData.numero_cuenta || '193-98765432-0-12',
      banco_nombre: clienteData.banco || 'BCP (Banco de Crédito del Perú)',
      detalle_origen_fondos: clienteData.detalle_origen_fondos || 'Ahorros personales',
      profesion: clienteData.profesion || 'Administradora de Empresas',
      ocupacion: clienteData.ocupacion || 'Administradora',
      empresa_centro_trabajo: clienteData.empresa_centro_trabajo || 'ADIDAS PERÚ',
      pep_si: clienteData.es_pep ? 'X' : '',
      pep_no: clienteData.es_pep ? '' : 'X',
      pep_institucion_cargo: clienteData.es_pep ? (clienteData.pep_institucion_cargo || '') : '',
      fecha_actual: fechaActualEs,
      dia: new Date().getDate().toString().padStart(2, '0'),
      mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      mes_nombre: mesNombre,
      anio: new Date().getFullYear().toString(),
      moneda_simbolo: (clienteData.moneda?.toUpperCase() === 'SOLES' || clienteData.moneda?.toUpperCase() === 'PEN') ? 'S/.' : '$',
      monto_inicial_invertir_formateado: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(clienteData.monto_inicial_invertir_usd || 50000),
      beneficiarios: (clienteData.beneficiarios && clienteData.beneficiarios.length > 0) ? clienteData.beneficiarios : [
        { nombre_completo: 'Carlos Alberto Rodríguez Novoa', fecha_nacimiento: '2024-01-10', parentesco: 'Hijo', porcentaje: 60 },
        { nombre_completo: 'María Fernanda Rodríguez Novoa', fecha_nacimiento: '2025-06-15', parentesco: 'Hija', porcentaje: 40 },
      ],
      residencia_fiscal_fuera_si: (clienteData.pais_residencia_fiscal && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERÚ' && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERU') ? 'X' : '',
      residencia_fiscal_fuera_no: (!clienteData.pais_residencia_fiscal || clienteData.pais_residencia_fiscal?.toUpperCase() === 'PERÚ' || clienteData.pais_residencia_fiscal?.toUpperCase() === 'PERU') ? 'X' : '',
      pais_residencia_fiscal_extranjero: (clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERÚ' && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERU') ? (clienteData.pais_residencia_fiscal || '') : '',
      doc_dni: clienteData.numero_documento || '72387643',
      doc_ruc: clienteData.numero_identificacion_fiscal || '10723876431',
      doc_nit: (clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERÚ' && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERU') ? (clienteData.numero_identificacion_fiscal || '') : '',
      ciudadano_residente_us: Boolean(clienteData.ciudadano_residente_us),
      conyuge_nombres_apellidos: clienteData.conyuge_nombres_apellidos || '',
      conyuge_tipo_documento: clienteData.conyuge_tipo_documento || 'DNI',
      conyuge_numero_documento: clienteData.conyuge_numero_documento || '',
      conyuge_celular: clienteData.conyuge_celular || '',
      conyuge_email: clienteData.conyuge_email || '',
      conyuge_fecha_matrimonio: clienteData.conyuge_fecha_matrimonio || '',
    };

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const bufferCarta = await this.renderPdfFromHbs(pathCarta, variablesData, browser);
      const bufferDJFlujos = await this.renderPdfFromHbs(pathDJFlujos, variablesData, browser);
      const bufferBeneficiario = await this.renderPdfFromHbs(pathBeneficiario, variablesData, browser);
      const bufferDJResidencia = await this.renderPdfFromHbs(pathDJResidencia, variablesData, browser);
      const bufferFichaCliente = await this.renderPdfFromHbs(pathFichaCliente, variablesData, browser);
      const bufferInstruccion = await this.renderPdfFromHbs(pathInstruccion, variablesData, browser);
      const bufferDeclaracion = await this.renderPdfFromHbs(pathDeclaracion, variablesData, browser);

      return new Promise<Buffer>((resolve, reject) => {
        const archive = getArchiverInstance('zip', { zlib: { level: 9 } });
        const buffers: Buffer[] = [];

        const customWritable = new Writable({
          write(chunk, encoding, callback) {
            buffers.push(chunk);
            callback();
          },
        });

        customWritable.on('finish', () => {
          resolve(Buffer.concat(buffers));
        });

        archive.on('error', (err: any) => {
          this.logger.error('Error al empaquetar el archivo ZIP de PDFs directos:', err);
          reject(err);
        });

        archive.pipe(customWritable);

        const docNum = clienteData.numero_documento || 'Inversionista';
        archive.append(bufferCarta, { name: `01_Carta_Solicitud_Participacion_${docNum}.pdf` });
        archive.append(bufferDJFlujos, { name: `02_DJ_Titularidad_Flujos_${docNum}.pdf` });
        archive.append(bufferBeneficiario, { name: `03_Formato_Beneficiario_Final_${docNum}.pdf` });
        archive.append(bufferDJResidencia, { name: `04_DJ_Residencia_Fiscal_${docNum}.pdf` });
        archive.append(bufferFichaCliente, { name: `05_Ficha_Cliente_Persona_Natural_${docNum}.pdf` });
        archive.append(bufferInstruccion, { name: `06_Instruccion_Inversion_${docNum}.pdf` });
        archive.append(bufferDeclaracion, { name: `07_Declaracion_Inversion_${docNum}.pdf` });

        archive.finalize();
      });
    } finally {
      await browser.close();
    }
  }
  async obtenerPreviewHtml(templateName: string): Promise<string> {
    const hbsDir = path.join(process.cwd(), 'templates', 'hbs');
    let filename = '';
    switch (templateName.toLowerCase()) {
      case 'carta':
        filename = '01_carta_solicitud_participacion.hbs';
        break;
      case 'flujos':
        filename = '02_dj_titularidad_flujos.hbs';
        break;
      case 'beneficiarios':
        filename = '03_formato_beneficiario_final.hbs';
        break;
      case 'residencia':
        filename = '04_dj_residencia_fiscal.hbs';
        break;
      case 'ficha':
      case 'ficha-cliente':
        filename = '05_ficha_cliente_pn.hbs';
        break;
      case 'instruccion':
      case 'instruccion-inversion':
        filename = '06_instruccion_inversion.hbs';
        break;
      case 'declaracion':
      case 'declaracion-inversion':
        filename = '07_declaracion_inversion.hbs';
        break;
      default:
        filename = '01_carta_solicitud_participacion.hbs';
    }

    const templatePath = path.join(hbsDir, filename);
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(`La plantilla ${filename} no fue encontrada.`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    const logoPath = path.join(hbsDir, 'corfid_logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
      logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }

    const mockData = {
      logo_corfid: logoBase64,
      nombres_apellidos: 'Fernanda Novoa Vásquez',
      tipo_documento: 'DNI',
      numero_documento: '72387643',
      nro_identificacion_fiscal: '10723876431',
      correo_electronico: 'fernanda.novoa@afinitive.pe',
      telefono_celular: '987654321',
      fecha_nacimiento: '2002-09-11',
      pais_nacimiento: 'Perú',
      nacionalidad: 'Peruana',
      direccion_completa: 'Jirón Durero 499, Dpto. 102',
      distrito: 'San Borja',
      provincia: 'Lima',
      departamento: 'Lima',
      codigo_postal: '15037',
      pais_residencia: 'Perú',
      cuenta_cci: '00219300987654320112',
      banco_nombre: 'BCP (Banco de Crédito del Perú)',
      detalle_origen_fondos: 'Ahorros personales provenientes de actividad comercial.',
      pep_institucion_cargo: 'Directora en Ministerio de Economía',
      fecha_actual: '20 de julio de 2026',
      dia: '20',
      mes: '07',
      mes_nombre: 'julio',
      anio: '2026',
      moneda_simbolo: '$',
      monto_inicial_invertir_formateado: '50,000.00',
      beneficiarios: [
        { nombre_completo: 'Carlos Alberto Rodríguez Novoa', fecha_nacimiento: '2024-01-10', parentesco: 'Hijo', porcentaje: 60 },
        { nombre_completo: 'María Fernanda Rodríguez Novoa', fecha_nacimiento: '2025-06-15', parentesco: 'Hija', porcentaje: 40 },
      ],
      residencia_fiscal_fuera_no: 'X',
      doc_dni: '72387643',
      doc_ruc: '10723876431',
      ciudadano_residente_us: false,
    };

    return template(mockData);
  }

  /**
   * Genera la vista previa HTML de una plantilla compilada en tiempo real usando los datos del formulario de la UI
   */
  async obtenerPreviewLiveHtml(templateName: string, clienteData: any): Promise<string> {
    const hbsDir = path.join(process.cwd(), 'templates', 'hbs');
    let filename = '';
    switch (templateName.toLowerCase()) {
      case 'carta':
        filename = '01_carta_solicitud_participacion.hbs';
        break;
      case 'flujos':
        filename = '02_dj_titularidad_flujos.hbs';
        break;
      case 'beneficiarios':
        filename = '03_formato_beneficiario_final.hbs';
        break;
      case 'residencia':
        filename = '04_dj_residencia_fiscal.hbs';
        break;
      case 'ficha':
      case 'ficha-cliente':
        filename = '05_ficha_cliente_pn.hbs';
        break;
      case 'instruccion':
      case 'instruccion-inversion':
        filename = '06_instruccion_inversion.hbs';
        break;
      case 'declaracion':
      case 'declaracion-inversion':
        filename = '07_declaracion_inversion.hbs';
        break;
      default:
        filename = '01_carta_solicitud_participacion.hbs';
    }

    const templatePath = path.join(hbsDir, filename);
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(`La plantilla ${filename} no fue encontrada.`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    const logoPath = path.join(hbsDir, 'corfid_logo.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
      logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }

    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const fechaActualEs = new Date().toLocaleDateString('es-ES', dateOptions);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mesNombre = meses[new Date().getMonth()];

    const liveVariables = {
      logo_corfid: logoBase64,
      nombres_apellidos: clienteData.nombres_apellidos || 'Fernanda Novoa Vásquez',
      tipo_documento: clienteData.tipo_documento || 'DNI',
      numero_documento: clienteData.numero_documento || '72387643',
      nro_identificacion_fiscal: clienteData.numero_identificacion_fiscal || '10723876431',
      correo_electronico: clienteData.correo_electronico || 'inversionista@afinitive.pe',
      telefono_celular: clienteData.telefono_celular || '987654321',
      fecha_nacimiento: clienteData.fecha_nacimiento || '2002-09-11',
      pais_nacimiento: clienteData.pais_nacimiento || 'Perú',
      nacionalidad: clienteData.nacionalidad || 'Peruana',
      estado_civil: clienteData.estado_civil || 'Soltero',
      grado_instruccion: clienteData.grado_instruccion || 'Superior Completo',
      direccion_completa: clienteData.direccion_completa || 'Jirón Durero 499, Dpto. 102',
      distrito: clienteData.distrito || 'San Borja',
      provincia: clienteData.provincia || 'Lima',
      departamento: clienteData.departamento || 'Lima',
      codigo_postal: clienteData.codigo_postal || '15037',
      pais_residencia: clienteData.pais_residencia || 'Perú',
      cuenta_cci: clienteData.cuenta_cci || '00219300987654320112',
      numero_cuenta: clienteData.numero_cuenta || '193-98765432-0-12',
      banco_nombre: clienteData.banco || 'BCP (Banco de Crédito del Perú)',
      detalle_origen_fondos: clienteData.detalle_origen_fondos || 'Ahorros personales',
      profesion: clienteData.profesion || 'Administradora de Empresas',
      ocupacion: clienteData.ocupacion || 'Administradora',
      empresa_centro_trabajo: clienteData.empresa_centro_trabajo || 'ADIDAS PERÚ',
      pep_si: clienteData.es_pep ? 'X' : '',
      pep_no: clienteData.es_pep ? '' : 'X',
      pep_institucion_cargo: clienteData.es_pep ? (clienteData.pep_institucion_cargo || '') : '',
      fecha_actual: fechaActualEs,
      dia: new Date().getDate().toString().padStart(2, '0'),
      mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      mes_nombre: mesNombre,
      anio: new Date().getFullYear().toString(),
      moneda_simbolo: (clienteData.moneda?.toUpperCase() === 'SOLES' || clienteData.moneda?.toUpperCase() === 'PEN') ? 'S/.' : '$',
      monto_inicial_invertir_formateado: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(clienteData.monto_inicial_invertir_usd || 50000),
      beneficiarios: (clienteData.beneficiarios && clienteData.beneficiarios.length > 0) ? clienteData.beneficiarios : [
        { nombre_completo: 'Carlos Alberto Rodríguez Novoa', fecha_nacimiento: '2024-01-10', parentesco: 'Hijo', porcentaje: 60 },
        { nombre_completo: 'María Fernanda Rodríguez Novoa', fecha_nacimiento: '2025-06-15', parentesco: 'Hija', porcentaje: 40 },
      ],
      residencia_fiscal_fuera_si: (clienteData.pais_residencia_fiscal && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERÚ' && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERU') ? 'X' : '',
      residencia_fiscal_fuera_no: (!clienteData.pais_residencia_fiscal || clienteData.pais_residencia_fiscal?.toUpperCase() === 'PERÚ' || clienteData.pais_residencia_fiscal?.toUpperCase() === 'PERU') ? 'X' : '',
      pais_residencia_fiscal_extranjero: (clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERÚ' && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERU') ? (clienteData.pais_residencia_fiscal || '') : '',
      doc_dni: clienteData.numero_documento || '72387643',
      doc_ruc: clienteData.numero_identificacion_fiscal || '10723876431',
      doc_nit: (clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERÚ' && clienteData.pais_residencia_fiscal?.toUpperCase() !== 'PERU') ? (clienteData.numero_identificacion_fiscal || '') : '',
      ciudadano_residente_us: Boolean(clienteData.ciudadano_residente_us),
      conyuge_nombres_apellidos: clienteData.conyuge_nombres_apellidos || '',
      conyuge_tipo_documento: clienteData.conyuge_tipo_documento || 'DNI',
      conyuge_numero_documento: clienteData.conyuge_numero_documento || '',
      conyuge_celular: clienteData.conyuge_celular || '',
      conyuge_email: clienteData.conyuge_email || '',
      conyuge_fecha_matrimonio: clienteData.conyuge_fecha_matrimonio || '',
    };

    return template(liveVariables);
  }

  /**
   * Helper privado para compilar Handlebars HTML5 y generar PDF con Puppeteer
   */
  private async renderPdfFromHbs(templatePath: string, variables: any, browser: puppeteer.Browser): Promise<Buffer> {
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    let htmlContent = template(variables);

    const logoPath = path.join(process.cwd(), 'templates', 'hbs', 'corfid_logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
      htmlContent = htmlContent.replace(/src="corfid_logo\.png"/g, `src="${logoBase64}"`);
    }

    const page = await browser.newPage();
    try {
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
      return Buffer.from(pdfBuffer);
    } catch (err: any) {
      this.logger.error(`Error al renderizar PDF desde Handlebars (${path.basename(templatePath)}):`, err?.message || err);
      throw err;
    } finally {
      await page.close();
    }
  }
}
