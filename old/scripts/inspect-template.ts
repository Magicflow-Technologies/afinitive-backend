import * as fs from 'fs';
import * as path from 'path';
import PizZip = require('pizzip');

function inspectTemplate() {
  const filePath = path.join(__dirname, '..', 'templates', 'FICHA CORFID-3.-4.- Formato Beneficiario Final - LIMPIA.docx');

  if (!fs.existsSync(filePath)) {
    console.error(`El archivo no existe en la ruta: ${filePath}`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    const docXml = zip.file('word/document.xml');

    if (!docXml) {
      console.error('No se pudo encontrar word/document.xml dentro del archivo .docx. El archivo podría estar corrupto.');
      return;
    }

    const xmlText = docXml.asText();
    
    // Buscar placeholders con expresión regular
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(xmlText)) !== null) {
      // Limpiar etiquetas XML que puedan estar intercaladas dentro de las llaves en Word
      const cleanVar = match[1].replace(/<[^>]+>/g, '').trim();
      matches.push(cleanVar);
    }

    console.log('--- ANÁLISIS DE PLANTILLA ---');
    console.log(`Archivo: ${path.basename(filePath)}`);
    console.log(`Total de placeholders detectados: ${matches.length}`);
    
    if (matches.length > 0) {
      console.log('Placeholders encontrados:');
      const uniqueMatches = Array.from(new Set(matches));
      uniqueMatches.forEach((m) => console.log(`  - {{${m}}}`));
    } else {
      console.log('No se detectaron placeholders con formato {{variable}}.');
    }
    console.log('-----------------------------');

  } catch (err) {
    console.error('Error al inspeccionar el archivo .docx:', err);
  }
}

inspectTemplate();
