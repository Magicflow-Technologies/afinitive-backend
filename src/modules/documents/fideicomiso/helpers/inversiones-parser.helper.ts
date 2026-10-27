import ExcelJS from 'exceljs';

export interface RawInversionRow {
  fila: number;
  numero?: string;
  inversionistaRaw: string;
  fideicomisoRaw: string;
  montoRaw: string;
  montoNumerico: number;
  moneda: string;
  tasaAnualRaw: string;
  vencimientoRaw: string;
  correoOpCoril: string;
  correoOpCorfid: string;
  enlaceCronograma: string;
}

/**
 * Normaliza una cadena removiendo acentos, caracteres extraños y pasando a minúsculas
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza cabecera para mapeo de columnas
 */
function normalizeHeader(val?: string | null): string {
  if (!val) return '';
  return normalizeText(val).replace(/[^a-z0-9]/g, '');
}

/**
 * Extrae monto numérico y moneda (USD / PEN)
 */
export function parseMonto(raw: any): { monto: number; moneda: string } {
  if (raw === null || raw === undefined) return { monto: 0, moneda: 'USD' };

  if (typeof raw === 'number') {
    return { monto: raw, moneda: 'USD' };
  }

  const str = String(raw).trim();
  const up = str.toUpperCase();
  let moneda = 'USD';
  if (up.includes('S/') || up.includes('PEN') || up.includes('SOLES')) {
    moneda = 'PEN';
  }

  // Quitar símbolos de moneda y textos
  let cleaned = str.replace(/[^\d.,]/g, '').trim();

  // Si tiene formato '1,500.00' o '1.500,00'
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato europeo 1.500,00 -> 1500.00
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano 1,500.00 -> 1500.00
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Si solo tiene coma y 2 decimales finales -> punto decimal
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = `${parts[0]}.${parts[1]}`;
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const num = parseFloat(cleaned);
  return {
    monto: isNaN(num) ? 0 : Math.round(num * 100) / 100,
    moneda,
  };
}

/**
 * Extrae texto y URLs de un valor de celda que puede ser enlace
 */
function extractValueAndLink(cellValue: any): { text: string; url?: string } {
  if (!cellValue) return { text: '', url: '' };

  if (typeof cellValue === 'object') {
    // Caso ExcelJS Hyperlink
    if (cellValue.text && cellValue.hyperlink) {
      return { text: String(cellValue.text).trim(), url: String(cellValue.hyperlink).trim() };
    }
    if (cellValue.richText && Array.isArray(cellValue.richText)) {
      const text = cellValue.richText.map((t: any) => t.text).join('').trim();
      return { text, url: '' };
    }
    if (cellValue instanceof Date) {
      return { text: cellValue.toISOString().split('T')[0], url: '' };
    }
  }

  const str = String(cellValue).trim();
  return { text: str };
}

/**
 * Parsea archivo HTML con tabla <table>...<tr>...<td>
 */
export function parseHtmlTable(htmlContent: string): RawInversionRow[] {
  const rows: RawInversionRow[] = [];

  // Extraer todas las filas <tr>
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  const parsedRows: Array<Array<{ text: string; url?: string }>> = [];

  while ((trMatch = trRegex.exec(htmlContent)) !== null) {
    const rowContent = trMatch[1];
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch: RegExpExecArray | null;
    const cells: Array<{ text: string; url?: string }> = [];

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      let cellInner = cellMatch[2];

      // Verificar si contiene etiqueta <a href="...">
      let url = '';
      const aMatch = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(cellInner);
      if (aMatch) {
        url = aMatch[1].trim();
      }

      // Quitar etiquetas HTML y entidades
      const text = cellInner
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, ' ')
        .trim();

      cells.push({ text, url });
    }

    if (cells.length > 0) {
      parsedRows.push(cells);
    }
  }

  if (parsedRows.length < 2) return rows;

  // Buscar cabecera
  let headerIndex = -1;
  let colMap: Record<string, number> = {};

  for (let i = 0; i < parsedRows.length; i++) {
    const r = parsedRows[i];
    const map: Record<string, number> = {};
    r.forEach((cell, idx) => {
      const norm = normalizeHeader(cell.text);
      if (norm.includes('inversionista') || norm.includes('cliente') || norm.includes('titular')) {
        map['inversionista'] = idx;
      } else if (norm.includes('fideicomiso') || norm.includes('patrimonio') || norm.includes('fondo')) {
        map['fideicomiso'] = idx;
      } else if (norm.includes('monto') || norm.includes('capital') || norm.includes('importe')) {
        map['monto'] = idx;
      } else if (norm.includes('tasa') || norm.includes('tea') || norm.includes('interes')) {
        map['tasa'] = idx;
      } else if (norm.includes('vencimiento') || norm.includes('plazo')) {
        map['vencimiento'] = idx;
      } else if (norm.includes('coril')) {
        map['correoOpCoril'] = idx;
      } else if (norm.includes('corfid')) {
        map['correoOpCorfid'] = idx;
      } else if (norm.includes('correo') || norm.includes('email')) {
        map['correosOperacion'] = idx;
      } else if (norm.includes('cronograma') || norm.includes('enlace') || norm.includes('link') || norm.includes('url')) {
        map['enlaceCronograma'] = idx;
      } else if (norm === 'n' || norm === 'no' || norm === 'num' || norm === 'item') {
        map['numero'] = idx;
      }
    });

    if ((map['inversionista'] !== undefined || map['fideicomiso'] !== undefined) && map['monto'] !== undefined) {
      headerIndex = i;
      colMap = map;
      break;
    }
  }

  // Si no hay columna inversionista explícita en la tabla, extraer del HTML (h1, detalle-item, title)
  let globalInversionista = '';
  const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(htmlContent);
  if (h1Match) {
    globalInversionista = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!globalInversionista) {
    const clienteMatch = /<label[^>]*>\s*Cliente\s*<\/label>\s*<div[^>]*>([\s\S]*?)<\/div>/i.exec(htmlContent);
    if (clienteMatch) {
      globalInversionista = clienteMatch[1].replace(/<[^>]+>/g, '').trim();
    }
  }
  if (!globalInversionista) {
    const titleMatch = /<title[^>]*>Perfil de inversiones\s*\|\s*([^<]+)<\/title>/i.exec(htmlContent);
    if (titleMatch) {
      globalInversionista = titleMatch[1].trim();
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    colMap = {
      numero: 0,
      inversionista: 1,
      fideicomiso: 2,
      monto: 3,
      tasa: 4,
      vencimiento: 5,
      correoOpCoril: 6,
      correoOpCorfid: 7,
      enlaceCronograma: 8,
    };
  }

  for (let rIdx = headerIndex + 1; rIdx < parsedRows.length; rIdx++) {
    const row = parsedRows[rIdx];
    let inversionistaRaw = colMap['inversionista'] !== undefined && row[colMap['inversionista']] ? row[colMap['inversionista']].text : '';
    if (!inversionistaRaw) {
      inversionistaRaw = globalInversionista;
    }
    if (!inversionistaRaw) continue;

    const fideicomisoRaw = colMap['fideicomiso'] !== undefined && row[colMap['fideicomiso']] ? row[colMap['fideicomiso']].text : '';
    const montoCell = colMap['monto'] !== undefined && row[colMap['monto']] ? row[colMap['monto']].text : '';
    const { monto, moneda } = parseMonto(montoCell);

    const tasaAnualRaw = colMap['tasa'] !== undefined && row[colMap['tasa']] ? row[colMap['tasa']].text : '';
    const vencimientoRaw = colMap['vencimiento'] !== undefined && row[colMap['vencimiento']] ? row[colMap['vencimiento']].text : '';
    
    let correoOpCoril = colMap['correoOpCoril'] !== undefined && row[colMap['correoOpCoril']] ? row[colMap['correoOpCoril']].text : '';
    let correoOpCorfid = colMap['correoOpCorfid'] !== undefined && row[colMap['correoOpCorfid']] ? row[colMap['correoOpCorfid']].text : '';

    if ((!correoOpCoril || !correoOpCorfid) && colMap['correosOperacion'] !== undefined && row[colMap['correosOperacion']]) {
      const allCorreosText = row[colMap['correosOperacion']].text;
      const emailsFound = allCorreosText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      for (const em of emailsFound) {
        if (em.toLowerCase().includes('coril') && !correoOpCoril) {
          correoOpCoril = em;
        } else if (em.toLowerCase().includes('corfid') && !correoOpCorfid) {
          correoOpCorfid = em;
        } else if (!correoOpCoril) {
          correoOpCoril = em;
        } else if (!correoOpCorfid) {
          correoOpCorfid = em;
        }
      }
    }

    let enlaceCronograma = '';
    if (colMap['enlaceCronograma'] !== undefined && row[colMap['enlaceCronograma']]) {
      const c = row[colMap['enlaceCronograma']];
      enlaceCronograma = c.url || c.text;
    }

    rows.push({
      fila: rIdx + 1,
      numero: colMap['numero'] !== undefined && row[colMap['numero']] ? row[colMap['numero']].text : String(rIdx),
      inversionistaRaw,
      fideicomisoRaw: fideicomisoRaw || 'AWM LIBRE 2',
      montoRaw: montoCell,
      montoNumerico: monto,
      moneda,
      tasaAnualRaw: tasaAnualRaw || '10 %',
      vencimientoRaw,
      correoOpCoril,
      correoOpCorfid,
      enlaceCronograma,
    });
  }

  return rows;
}

/**
 * Parsea archivo Excel (.xlsx / .xls)
 */
export async function parseExcelFile(buffer: Buffer): Promise<RawInversionRow[]> {
  const rows: RawInversionRow[] = [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) return rows;

  let headerRowIndex = -1;
  let colMap: Record<string, number> = {};

  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIndex !== -1) return;
    const map: Record<string, number> = {};

    row.eachCell((cell, colNumber) => {
      const norm = normalizeHeader(cell.text || String(cell.value || ''));
      if (norm.includes('inversionista') || norm.includes('cliente') || norm.includes('titular')) {
        map['inversionista'] = colNumber;
      } else if (norm.includes('fideicomiso') || norm.includes('patrimonio') || norm.includes('fondo')) {
        map['fideicomiso'] = colNumber;
      } else if (norm.includes('monto') || norm.includes('capital') || norm.includes('importe')) {
        map['monto'] = colNumber;
      } else if (norm.includes('tasa') || norm.includes('tea') || norm.includes('interes')) {
        map['tasa'] = colNumber;
      } else if (norm.includes('vencimiento') || norm.includes('plazo')) {
        map['vencimiento'] = colNumber;
      } else if (norm.includes('coril')) {
        map['correoOpCoril'] = colNumber;
      } else if (norm.includes('corfid')) {
        map['correoOpCorfid'] = colNumber;
      } else if (norm.includes('correo') || norm.includes('email')) {
        map['correosOperacion'] = colNumber;
      } else if (norm.includes('cronograma') || norm.includes('enlace') || norm.includes('link') || norm.includes('url')) {
        map['enlaceCronograma'] = colNumber;
      } else if (norm === 'n' || norm === 'no' || norm === 'num' || norm === 'item') {
        map['numero'] = colNumber;
      }
    });

    if (map['inversionista'] !== undefined && (map['fideicomiso'] !== undefined || map['monto'] !== undefined)) {
      headerRowIndex = rowNumber;
      colMap = map;
    }
  });

  if (headerRowIndex === -1) {
    headerRowIndex = 1;
    colMap = {
      numero: 1,
      inversionista: 2,
      fideicomiso: 3,
      monto: 4,
      tasa: 5,
      vencimiento: 6,
      correoOpCoril: 7,
      correoOpCorfid: 8,
      enlaceCronograma: 9,
    };
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return;

    const inversionistaCell = colMap['inversionista'] ? row.getCell(colMap['inversionista']) : null;
    const invData = extractValueAndLink(inversionistaCell?.value);
    const inversionistaRaw = invData.text;
    if (!inversionistaRaw) return;

    const fideicomisoCell = colMap['fideicomiso'] ? row.getCell(colMap['fideicomiso']) : null;
    const fideicomisoRaw = extractValueAndLink(fideicomisoCell?.value).text || 'AWM LIBRE 2';

    const montoCell = colMap['monto'] ? row.getCell(colMap['monto']) : null;
    const { monto, moneda } = parseMonto(montoCell?.value);

    const tasaCell = colMap['tasa'] ? row.getCell(colMap['tasa']) : null;
    let tasaAnualRaw = extractValueAndLink(tasaCell?.value).text;
    if (typeof tasaCell?.value === 'number') {
      tasaAnualRaw = `${(tasaCell.value * (tasaCell.value < 1 ? 100 : 1)).toFixed(2)} %`;
    }

    const vencimientoCell = colMap['vencimiento'] ? row.getCell(colMap['vencimiento']) : null;
    const vencimientoRaw = extractValueAndLink(vencimientoCell?.value).text;

    const corilCell = colMap['correoOpCoril'] ? row.getCell(colMap['correoOpCoril']) : null;
    let correoOpCoril = extractValueAndLink(corilCell?.value).text;

    const corfidCell = colMap['correoOpCorfid'] ? row.getCell(colMap['correoOpCorfid']) : null;
    let correoOpCorfid = extractValueAndLink(corfidCell?.value).text;

    if ((!correoOpCoril || !correoOpCorfid) && colMap['correosOperacion']) {
      const allCorreosText = extractValueAndLink(row.getCell(colMap['correosOperacion'])?.value).text;
      const emailsFound = allCorreosText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      for (const em of emailsFound) {
        if (em.toLowerCase().includes('coril') && !correoOpCoril) {
          correoOpCoril = em;
        } else if (em.toLowerCase().includes('corfid') && !correoOpCorfid) {
          correoOpCorfid = em;
        } else if (!correoOpCoril) {
          correoOpCoril = em;
        } else if (!correoOpCorfid) {
          correoOpCorfid = em;
        }
      }
    }

    const cronogramaCell = colMap['enlaceCronograma'] ? row.getCell(colMap['enlaceCronograma']) : null;
    const cronoData = extractValueAndLink(cronogramaCell?.value);
    const enlaceCronograma = cronoData.url || cronoData.text;

    const numeroCell = colMap['numero'] ? row.getCell(colMap['numero']) : null;
    const numero = extractValueAndLink(numeroCell?.value).text || String(rowNumber);

    rows.push({
      fila: rowNumber,
      numero,
      inversionistaRaw,
      fideicomisoRaw,
      montoRaw: String(montoCell?.value ?? monto),
      montoNumerico: monto,
      moneda,
      tasaAnualRaw: tasaAnualRaw || '10 %',
      vencimientoRaw,
      correoOpCoril,
      correoOpCorfid,
      enlaceCronograma,
    });
  });

  return rows;
}

/**
 * Función principal que detecta si es HTML o Excel y retorna las filas normalizadas
 */
export async function parseInversionesBuffer(buffer: Buffer, fileName: string): Promise<RawInversionRow[]> {
  const isHtml =
    fileName.toLowerCase().endsWith('.html') ||
    fileName.toLowerCase().endsWith('.htm') ||
    buffer.slice(0, 100).toString('utf-8').toLowerCase().includes('<html') ||
    buffer.slice(0, 100).toString('utf-8').toLowerCase().includes('<table');

  if (isHtml) {
    const htmlText = buffer.toString('utf-8');
    return parseHtmlTable(htmlText);
  } else {
    return await parseExcelFile(buffer);
  }
}
