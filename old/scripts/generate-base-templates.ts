import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as fs from 'fs';
import * as path from 'path';

async function generateTemplates() {
  const templatesDir = path.join(__dirname, '..', 'templates');

  // Asegurar que exista la carpeta templates
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // 1. Generar Plantilla CORFID
  const corfidDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'PLANTILLA DE FORMATO FIDUCIARIO - CORFID', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Nombres y apellidos: ', bold: true }),
              new TextRun({ text: '{{nombres_apellidos}}' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'DNI N°: ', bold: true }),
              new TextRun({ text: '{{numero_documento}}' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'RUC: ', bold: true }),
              new TextRun({ text: '{{nro_identificacion_fiscal}}' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Fecha de Nacimiento: ', bold: true }),
              new TextRun({ text: '{{fecha_nacimiento}}' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Dirección: ', bold: true }),
              new TextRun({ text: '{{direccion_completa}}, {{distrito}}, {{provincia}}' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Cuenta de Destino: ', bold: true }),
              new TextRun({ text: '{{cuenta_cci}}' }),
              new TextRun({ text: ' en el banco ' }),
              new TextRun({ text: '{{banco_nombre}}' }),
            ],
          }),
        ],
      },
    ],
  });

  const corfidBuffer = await Packer.toBuffer(corfidDoc);
  fs.writeFileSync(path.join(templatesDir, 'corfid.docx'), corfidBuffer);
  console.log('Plantilla corfid.docx creada con éxito.');

  // 2. Generar Plantilla CORIL
  const corilDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'PLANTILLA DE FORMATO FIDUCIARIO - CORIL', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Declaración Jurada de Origen de Fondos: ', bold: true }),
              new TextRun({ text: '{{detalle_origen_fondos}}' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Institución y cargo (PEP): ', bold: true }),
              new TextRun({ text: '{{pep_institucion_cargo}}' }),
            ],
          }),
        ],
      },
    ],
  });

  const corilBuffer = await Packer.toBuffer(corilDoc);
  fs.writeFileSync(path.join(templatesDir, 'coril.docx'), corilBuffer);
  console.log('Plantilla coril.docx creada con éxito.');
}

generateTemplates().catch((err) => {
  console.error('Error al generar las plantillas base:', err);
});
