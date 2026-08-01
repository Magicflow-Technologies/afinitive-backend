import * as fs from 'fs';
import * as path from 'path';
import PizZip = require('pizzip');

function cleanWordXml(xml: string): string {
  let result = '';
  let inBraces = false;
  let inXmlTag = false;

  for (let i = 0; i < xml.length; i++) {
    const char = xml[i];

    if (char === '{' && xml[i + 1] === '{') {
      inBraces = true;
    }

    if (inBraces) {
      if (char === '<') {
        inXmlTag = true;
        continue;
      }
      if (char === '>') {
        inXmlTag = false;
        continue;
      }
      if (inXmlTag) {
        continue;
      }
      if (char === '}' && i > 0 && xml[i - 1] === '}') {
        inBraces = false;
      }
    }

    result += char;
  }

  return result;
}

function fixAllTemplates() {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.docx'));

  console.log(`Desfragmentando XML de ${files.length} plantillas Word...`);

  files.forEach((file) => {
    const filePath = path.join(templatesDir, file);
    try {
      const content = fs.readFileSync(filePath, 'binary');
      const zip = new PizZip(content);
      const docXml = zip.file('word/document.xml');

      if (docXml) {
        const xmlText = docXml.asText();
        const cleanedXml = cleanWordXml(xmlText);
        zip.file('word/document.xml', cleanedXml);

        const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ Plantilla desfragmentada con éxito: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error al procesar plantilla ${file}:`, err);
    }
  });
}

fixAllTemplates();
