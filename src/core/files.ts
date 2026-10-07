import Papa from 'papaparse';
import { looksLike182, parse182, type Parsed182 } from './boe182';
import { detectMapping } from './mapping';
import { decodeText } from './text';
import type { Cell } from './values';

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_ROWS = 100_000;

export interface TableFile {
  kind: 'table';
  name: string;
  headers: string[];
  rows: Cell[][];
  /** 0-based index of the header row in the original sheet. */
  headerRow: number;
  note?: string;
}

export interface Model182File {
  kind: 'model182';
  name: string;
  parsed: Parsed182;
}

export type LoadedFile = TableFile | Model182File;

export class FileReadError extends Error {}

function extension(name: string): string {
  return name.toLowerCase().split('.').pop() ?? '';
}

/**
 * Pick the header row: the first of the first 15 rows where we can recognise
 * a NIF or amount column. Falls back to the first non-empty row.
 */
export function splitHeader(data: Cell[][]): { headers: string[]; rows: Cell[][]; headerRow: number } {
  const limit = Math.min(data.length, 15);
  let headerRow = -1;
  for (let i = 0; i < limit; i++) {
    const headers = (data[i] ?? []).map((c) => (c === null || c === undefined ? '' : String(c)));
    const m = detectMapping(headers);
    if (m.nif !== undefined || m.amount !== undefined) {
      headerRow = i;
      break;
    }
  }
  if (headerRow < 0) headerRow = data.findIndex((r) => r && r.some((c) => c !== null && String(c).trim() !== ''));
  if (headerRow < 0) throw new FileReadError('El archivo está vacío.');
  const headers = (data[headerRow] ?? []).map((c, i) => (c === null || c === undefined || String(c).trim() === '' ? `Columna ${i + 1}` : String(c).trim()));
  return { headers, rows: data.slice(headerRow + 1), headerRow };
}

export function parseCsvText(text: string): Cell[][] {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', delimiter: '' });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new FileReadError(`No se pudo leer el CSV: ${result.errors[0]?.message ?? 'formato desconocido'}`);
  }
  return result.data;
}

export async function loadFile(file: File): Promise<LoadedFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new FileReadError(`"${file.name}" pesa más de 15 MB. Divide el archivo o exporta solo las columnas necesarias.`);
  }
  const ext = extension(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (ext === 'xlsx') {
    // Lazy-load the XLSX reader: most users bring CSV.
    const { readSheet } = await import('read-excel-file/browser');
    let data: Cell[][];
    try {
      data = (await readSheet(file)) as unknown as Cell[][];
    } catch (err) {
      throw new FileReadError(`No se pudo leer el Excel "${file.name}". ¿Está protegido con contraseña o dañado? (${(err as Error).message})`);
    }
    return toTable(file.name, data, 'Se ha leído la primera hoja del libro.');
  }

  if (ext === 'xls') {
    throw new FileReadError('El formato .xls (Excel 97-2003) no está soportado. Ábrelo en Excel y guárdalo como .xlsx o .csv.');
  }

  if (ext === 'csv' || ext === 'txt' || ext === 'tsv' || ext === '') {
    const { text, encoding } = decodeText(bytes);
    if (looksLike182(text)) {
      return { kind: 'model182', name: file.name, parsed: parse182(text, file.name) };
    }
    const data = parseCsvText(text);
    return toTable(file.name, data, encoding === 'windows-1252' ? 'Codificación detectada: Windows-1252 (CSV de Excel).' : undefined);
  }

  throw new FileReadError(`Formato no soportado: .${ext}. Usa .csv, .xlsx o el .txt del modelo 182.`);
}

function toTable(name: string, data: Cell[][], note?: string): TableFile {
  if (data.length > MAX_ROWS) throw new FileReadError(`El archivo tiene más de ${MAX_ROWS.toLocaleString('es')} filas.`);
  const { headers, rows, headerRow } = splitHeader(data);
  return { kind: 'table', name, headers, rows, headerRow, note };
}
