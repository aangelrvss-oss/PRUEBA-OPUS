import type { Declaration } from './engine';
import { PROVINCES } from './provinces';

/**
 * Text that a spreadsheet would read as a formula (=, +, @, tab/CR, or "-" not
 * followed by a number) is prefixed with an apostrophe: donor names can come
 * from public donation forms (CSV/formula injection, OWASP).
 */
export function neutralizeFormula(v: string): string {
  return /^[=+@\t\r]/.test(v) || /^-(?![\d.,]+$)/.test(v) ? `'${v}` : v;
}

/** CSV for Spanish Excel: semicolon separator, UTF-8 with BOM, decimal comma. */
function csv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = typeof v === 'number' ? String(v) : neutralizeFormula(v);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
}

function amount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

const NATURE: Record<string, string> = { F: 'Persona física', J: 'Persona jurídica', E: 'Entidad en atribución de rentas' };

/** One line per donor with the numbers and the reasoning, for review or for the board. */
export function donorReportCsv(d: Declaration): string {
  const y = d.year;
  const header = ['NIF', 'Nombre', 'Naturaleza', 'Provincia', `Total ${y - 2}`, `Total ${y - 1}`, `Total ${y}`,
    'Recurrente', 'Motivo', 'Registros (clave · % · importe)', 'Incluido en el fichero', 'Motivo de exclusión', 'Notas'];
  const rows = d.donors.map((x) => [
    x.nif,
    x.name,
    NATURE[x.nature] ?? x.nature,
    x.province ? `${x.province} ${PROVINCES[x.province] ?? ''}`.trim() : '',
    amount(x.totals[y - 2] ?? 0),
    amount(x.totals[y - 1] ?? 0),
    amount(x.totals[y] ?? 0),
    x.verdict.recurrent ? 'Sí' : 'No',
    x.verdict.reason,
    x.records.map((r) => `${r.key}${r.inKind ? ' (especie)' : ''} · ${r.percent} % · ${amount(r.amountCents)}`).join(' | '),
    x.included ? 'Sí' : 'No',
    x.blockedBy ?? '',
    x.notes.join(' '),
  ]);
  const problems = d.issues
    .filter((i) => i.severity === 'error' && !i.nif)
    .map((i) => ['', i.name ?? '', '', '', '', '', i.amountCents !== undefined ? amount(i.amountCents) : '', '', '', '', 'No', i.message, i.action]);
  return csv([header, ...rows, ...problems]);
}

/**
 * Yearly totals per donor (this year and the history used). Keep it: next
 * year, drop it next to the new spreadsheet and recurrence is computed again.
 */
export function historyCsv(d: Declaration): string {
  const rows: (string | number)[][] = [['NIF', 'Nombre', 'Ejercicio', 'Importe']];
  for (const x of d.donors) {
    for (const year of [d.year - 1, d.year]) {
      const cents = x.totals[year] ?? 0;
      if (cents > 0 && (year === d.year ? x.included : true)) rows.push([x.nif, x.name, year, amount(cents)]);
    }
  }
  return csv(rows);
}
