import type { Declaration, HistoryEntry, Record182 } from './engine';
import { validateNif } from './nif';
import { alpha, encodeLatin1, nifField, numeric } from './text';

/**
 * Writer and reader for the Modelo 182 fixed-width file ("formato BOE"),
 * following the AEAT register design: 250-position records, type 1
 * (declarant) followed by type 2 (declared) records, ISO-8859-1.
 * Records are separated by CR LF.
 */

export const RECORD_LENGTH = 250;
export const LINE_BREAK = '\r\n';

export interface EntityInfo {
  nif: string;
  name: string;
  phone: string;
  contactName: string;
  /** 13-digit "número de justificante". Optional: the AEAT form assigns its own. */
  receiptNumber?: string;
  /** "C" complementaria, "S" sustitutiva, or empty for a normal return. */
  replacement?: '' | 'C' | 'S';
  previousReceiptNumber?: string;
}

export interface EntityProblem {
  field: keyof EntityInfo;
  message: string;
}

export function entityProblems(e: EntityInfo): EntityProblem[] {
  const p: EntityProblem[] = [];
  const nif = validateNif(e.nif);
  if (!nif.ok) p.push({ field: 'nif', message: `NIF de la entidad no válido: ${nif.reason}.` });
  else if (nif.kind !== 'ENTITY') p.push({ field: 'nif', message: 'El declarante debe ser una entidad (NIF que empieza por letra, p. ej. G).' });
  if (!e.name.trim()) p.push({ field: 'name', message: 'Indica la denominación completa de la entidad.' });
  if (!/^\d{9}$/.test(e.phone.replace(/\s/g, ''))) p.push({ field: 'phone', message: 'El teléfono de contacto debe tener 9 dígitos.' });
  if (!e.contactName.trim()) p.push({ field: 'contactName', message: 'Indica la persona de contacto (apellidos y nombre).' });
  if (e.receiptNumber && !/^182\d{10}$/.test(e.receiptNumber)) {
    p.push({ field: 'receiptNumber', message: 'El número de justificante tiene 13 dígitos y empieza por 182.' });
  }
  if (e.replacement && !/^\d{13}$/.test(e.previousReceiptNumber ?? '')) {
    p.push({ field: 'previousReceiptNumber', message: 'Para una complementaria o sustitutiva indica el justificante anterior (13 dígitos).' });
  }
  return p;
}

/** Split integer cents into the integer and 2-digit decimal parts. */
function money(cents: number, intLength: number): string {
  if (cents < 0) throw new Error('Los importes deben ser positivos');
  return numeric(Math.floor(cents / 100), intLength) + numeric(cents % 100, 2);
}

function percent(p: number): string {
  const hundredths = Math.round(p * 100);
  return numeric(Math.floor(hundredths / 100), 3) + numeric(hundredths % 100, 2);
}

function assertLength(rec: string, what: string): string {
  if (rec.length !== RECORD_LENGTH) throw new Error(`Registro ${what} de ${rec.length} posiciones (deben ser 250)`);
  return rec;
}

export function declarantRecord(year: number, e: EntityInfo, records: Record182[]): string {
  const nif = validateNif(e.nif);
  if (!nif.ok) throw new Error('NIF de la entidad no válido');
  const total = records.reduce((s, r) => s + r.amountCents, 0);
  const rec =
    '1' + // 1 tipo de registro
    '182' + // 2-4 modelo
    numeric(year, 4) + // 5-8 ejercicio
    nifField(nif.nif) + // 9-17 NIF declarante
    alpha(e.name, 40) + // 18-57 denominación
    'T' + // 58 tipo de soporte: telemático
    numeric(e.phone.replace(/\s/g, ''), 9) + // 59-67 teléfono
    alpha(e.contactName, 40) + // 68-107 persona de contacto
    numeric(e.receiptNumber || '1820000000000', 13) + // 108-120 número de justificante
    (e.replacement === 'C' ? 'C' : ' ') + // 121 complementaria
    (e.replacement === 'S' ? 'S' : ' ') + // 122 sustitutiva
    numeric(e.replacement ? e.previousReceiptNumber ?? '' : '', 13) + // 123-135 declaración anterior
    numeric(records.length, 9) + // 136-144 número de registros de declarados
    money(total, 13) + // 145-159 importe total
    '1' + // 160 naturaleza del declarante: entidad Ley 49/2002
    ' '.repeat(77) + // 161-237 blancos
    ' '.repeat(13); // 238-250 sello electrónico
  return assertLength(rec, 'de declarante');
}

export function declaredRecord(year: number, declarantNif: string, r: Record182): string {
  const rec =
    '2' + // 1
    '182' + // 2-4
    numeric(year, 4) + // 5-8
    nifField(declarantNif) + // 9-17 NIF declarante
    nifField(r.nif) + // 18-26 NIF declarado
    (r.representativeNif ? nifField(r.representativeNif) : ' '.repeat(9)) + // 27-35 representante legal
    alpha(r.name, 40) + // 36-75 apellidos y nombre o razón social
    numeric(r.province, 2) + // 76-77 código provincia
    r.key + // 78 clave
    percent(r.percent) + // 79-83 % deducción
    money(r.amountCents, 11) + // 84-96 importe
    (r.inKind ? 'X' : ' ') + // 97 en especie
    '00' + // 98-99 deducción comunidad autónoma (no gestionada)
    '00000' + // 100-104 % deducción comunidad autónoma
    r.nature + // 105 naturaleza del declarado
    ' ' + // 106 revocación
    '0000' + // 107-110 ejercicio de la donación revocada
    ' ' + // 111 tipo de bien
    ' '.repeat(20) + // 112-131 identificación del bien
    (r.recurrent ? '1' : '2') + // 132 recurrencia donativos
    ' '.repeat(9) + // 133-141 NIF titular patrimonio protegido
    ' '.repeat(40) + // 142-181 titular patrimonio protegido
    ' '.repeat(69); // 182-250 blancos
  return assertLength(rec, 'de declarado');
}

export interface Built182 {
  lines: string[];
  text: string;
  bytes: Uint8Array;
  fileName: string;
}

export function build182(decl: Declaration, entity: EntityInfo): Built182 {
  const nif = validateNif(entity.nif);
  if (!nif.ok) throw new Error('NIF de la entidad no válido');
  const lines = [
    declarantRecord(decl.year, entity, decl.records),
    ...decl.records.map((r) => declaredRecord(decl.year, nif.nif, r)),
  ];
  const text = lines.join(LINE_BREAK) + LINE_BREAK;
  return { lines, text, bytes: encodeLatin1(text), fileName: `182_${decl.year}_${nif.nif}.txt` };
}

/* ------------------------------------------------------------------ */
/* Field map, used by the record inspector in the UI                   */
/* ------------------------------------------------------------------ */

export interface FieldSpan {
  from: number; // 1-based, inclusive
  to: number;
  label: string;
}

export const DECLARED_FIELDS: FieldSpan[] = [
  { from: 1, to: 1, label: 'Tipo de registro (2)' },
  { from: 2, to: 4, label: 'Modelo' },
  { from: 5, to: 8, label: 'Ejercicio' },
  { from: 9, to: 17, label: 'NIF del declarante' },
  { from: 18, to: 26, label: 'NIF del declarado' },
  { from: 27, to: 35, label: 'NIF del representante legal' },
  { from: 36, to: 75, label: 'Apellidos y nombre o razón social' },
  { from: 76, to: 77, label: 'Código de provincia' },
  { from: 78, to: 78, label: 'Clave (A/B)' },
  { from: 79, to: 83, label: '% de deducción (3 enteros + 2 decimales)' },
  { from: 84, to: 96, label: 'Importe (11 enteros + 2 decimales)' },
  { from: 97, to: 97, label: 'En especie (X)' },
  { from: 98, to: 104, label: 'Deducción autonómica (no usada)' },
  { from: 105, to: 105, label: 'Naturaleza del declarado (F/J/E)' },
  { from: 106, to: 131, label: 'Revocación y bienes (no usados)' },
  { from: 132, to: 132, label: 'Recurrencia (1 sí / 2 no)' },
  { from: 133, to: 250, label: 'Patrimonio protegido y blancos' },
];

/* ------------------------------------------------------------------ */
/* Reader: previous years' files as history                            */
/* ------------------------------------------------------------------ */

export interface Parsed182 {
  year: number | null;
  declarantNif: string | null;
  declarantName: string;
  entries: HistoryEntry[];
  recordCount: number;
  warnings: string[];
}

/** Split file text into 250-char records, with or without line breaks. */
function splitRecords(text: string): string[] {
  const clean = text.replace(/^﻿/, '');
  if (/[\r\n]/.test(clean)) return clean.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  const out: string[] = [];
  for (let i = 0; i < clean.length; i += RECORD_LENGTH) out.push(clean.slice(i, i + RECORD_LENGTH));
  return out.filter((l) => l.trim().length > 0);
}

/** Does this text look like a Modelo 182 file? */
export function looksLike182(text: string): boolean {
  const first = splitRecords(text.slice(0, 2000))[0] ?? '';
  return /^[12]182\d{4}/.test(first);
}

export function parse182(text: string, source: string): Parsed182 {
  const warnings: string[] = [];
  const lines = splitRecords(text);
  let year: number | null = null;
  let declarantNif: string | null = null;
  let declarantName = '';
  const byNif = new Map<string, HistoryEntry>();
  let recordCount = 0;

  lines.forEach((raw, i) => {
    const line = raw.padEnd(RECORD_LENGTH, ' ');
    if (!line.startsWith('182', 1)) {
      warnings.push(`Línea ${i + 1}: no es un registro del modelo 182; se ignora.`);
      return;
    }
    const y = Number(line.slice(4, 8));
    if (line[0] === '1') {
      year = y;
      declarantNif = line.slice(8, 17).trim();
      declarantName = line.slice(17, 57).trim();
      return;
    }
    if (line[0] !== '2') return;
    recordCount++;
    if (year === null) year = y;
    const key = line[77];
    if (key !== 'A' && key !== 'B') return; // only deductible donations of Ley 49/2002 entities
    if (line[105] === 'X') return; // revocation of a previous donation
    const nifRaw = line.slice(17, 26);
    const nif = validateNif(nifRaw);
    if (!nif.ok) {
      warnings.push(`Línea ${i + 1}: NIF "${nifRaw.trim()}" no válido; se ignora.`);
      return;
    }
    const intPart = line.slice(83, 94);
    const decPart = line.slice(94, 96);
    if (!/^\d{11}$/.test(intPart) || !/^\d{2}$/.test(decPart)) {
      warnings.push(`Línea ${i + 1}: importe ilegible; se ignora.`);
      return;
    }
    const cents = Number(intPart) * 100 + Number(decPart);
    const prev = byNif.get(nif.nif);
    if (prev) prev.amountCents += cents;
    else byNif.set(nif.nif, { nif: nif.nif, year: y, amountCents: cents, source });
  });

  if (year === null) warnings.push('No se ha encontrado ningún registro del modelo 182.');
  return { year, declarantNif, declarantName, entries: [...byNif.values()], recordCount, warnings };
}
