import * as fs from 'fs';
import * as path from 'path';
import PizZip = require('pizzip');

function cleanXmlTags(xmlText: string): string {
  // 1. Reemplazar etiquetas XML internas dentro de {{ ... }}
  let cleaned = xmlText.replace(/\{\{([^}]+)\}\}/g, (match, tagContent) => {
    const cleanTag = tagContent.replace(/<[^>]+>/g, '').trim();
    return `{{${cleanTag}}}`;
  });

  // 2. Unificar llaves dobles fragmentadas en elementos <w:t>
  cleaned = cleaned.replace(/\{<[^>]+>\{/g, '{{');
  cleaned = cleaned.replace(/\}<[^>]+>\}/g, '}}');

  return cleaned;
}

function cleanAllTemplates() {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.docx'));

  console.log(`Iniciando limpieza XML de ${files.length} plantillas Word...`);

  files.forEach((file) => {
    const filePath = path.join(templatesDir, file);
    try {
      const content = fs.readFileSync(filePath, 'binary');
      const zip = new PizZip(content);
      const docXml = zip.file('word/document.xml');

      if (docXml) {
        const xmlText = docXml.asText();
        const cleanedXml = cleanXmlTags(xmlText);
        zip.file('word/document.xml', cleanedXml);

        const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Plantilla limpiada con éxito: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error al limpiar plantilla ${file}:`, err);
    }
  });
}

cleanAllTemplates();
