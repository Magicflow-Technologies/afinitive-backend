import type ExcelJS from 'exceljs';

/**
 * Normaliza cualquier cabecera de Excel para hacer la búsqueda flexible:
 * - Elimina asteriscos (*)
 * - Elimina tildes y diacríticos
 * - Convierte a minúsculas
 * - Colapsa espacios y saltos de línea
 */
export function normalizeHeaderKey(rawHeader: string): string {
  if (!rawHeader) return '';
  return rawHeader
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos
    .replace(/[*?:/\\#]/g, '') // Quita símbolos especiales
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Unitifcar espacios
}

/**
 * Extrae el valor primitivo real de una celda de ExcelJS,
 * manejando celdas como fórmulas, hupervínculos o texto enriquecido.
 */
export function extractCellValue(cellValue: ExcelJS.CellValue): unknown {
  if (cellValue === null || cellValue === undefined) return null;

  // Si es un objetivo de ExcelJS (fórmula, rich text, etc.)
  if (typeof cellValue === 'object') {
    //Caso Date nativo de JS
    if (cellValue instanceof Date) {
      return cellValue;
    }

    //Celda con fórmula: { foruma: '....', result: 'valor' }
    if ('result' in cellValue && cellValue.result !== undefined) {
      return cellValue.result;
    }

    // Texto enriquecido (richText): array de { text: string }
    if ('richText' in cellValue && Array.isArray(cellValue.richText)) {
      return cellValue.richText
        .map((chunk) => chunk.text)
        .join('')
        .trim();
    }

    // Hipervínculo: { text: '...', hyperlink: '...'}
    if ('text' in cellValue && typeof (cellValue as any).text === 'string') {
      return (cellValue as any).text;
    }
  }

  return cellValue;
}

/**
 * Convierte el valor de celda a string (o undefined si está vacío)
 */
export function parseString(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined;

  const str = String(val).trim();
  return str.length > 0 ? str : undefined;
}

/**
 * Parsea campos booleanos aceptando variantes típicas en hojas de cálculo en
 * español e ingles:
 * "SÍ", "SI", "YES", "TRUE", "1", "X", etc.
 */
export function parseBoolean(
  val: unknown,
  defaultValue: boolean = false,
): boolean {
  if (val === null || val === undefined) return defaultValue;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 1;

  const normalized = String(val)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos
    .toLowerCase();

  const verdaderos = ['si', 'sí', 'yes', 'y', 'true', '1', 'x'];
  const falsos = ['no', 'n', 'false', '0'];

  if (verdaderos.includes(normalized)) return true;
  if (falsos.includes(normalized)) return false;
  return defaultValue;
}

/**
 * Parsea montos o números eliminando símbolos de moneda, comas y espacios.
 * Ej: "$ 50,000.50" -> 50000.50
 */
export function parseNumber(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;

  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : undefined;
  }

  const cleaned = String(val)
    .replace(/[$\sS/€,]/g, '') // Quita $, S/, €, comas y espacios
    .trim();

  if (cleaned.length === 0) return undefined;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * Convierte fechas de Excel (Date, serial number o string DD/MM/AAAA)
 * a formato ISO YYYY-MM-DD para guardado homogéneo.
 */
export function parseDate(val: unknown): string | undefined {
  if (!val) return undefined;

  // 1. Instancia nativa Date
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return undefined; // Fecha inválida
    return val.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // 2. Número serial de Excel (ej: 44927)
  if (typeof val === 'number') {
    // La época de Excel inicia el 30/12/1899 denido a un bug historico de año bisiesto en 1900
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000); // 86400000 ms en un día
    if (!Number.isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    return undefined;
  }

  const str = String(val).trim();
  if (!str) return undefined;

  // 3. Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 4. Formato DD/MM/YYYY o DD/MM/YY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const dia = dmyMatch[1].padStart(2, '0');
    const mes = dmyMatch[2].padStart(2, '0');
    const anio = dmyMatch[3];
    return `${anio}-${mes}-${dia}`;
  }
  // Fallback con Date.parse
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
}
