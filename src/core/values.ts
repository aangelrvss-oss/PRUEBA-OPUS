/** Parsing of amounts, dates/years and yes/no cells as found in Spanish spreadsheets. */

export type Cell = string | number | boolean | Date | null | undefined;

/**
 * Parse an amount into integer cents.
 * Accepts numbers and strings like "1.234,56 €", "1234.56", "-20", "35,5".
 * Returns null when the value is not a number.
 */
export function parseAmountCents(value: Cell): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) : null;
  if (typeof value !== 'string') return null;

  let s = value.replace(/[€\s ]|EUR|eur/g, '');
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^[\d.,']+$/.test(s) || !/\d/.test(s)) return null;
  s = s.replace(/'/g, '');

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the last one is the decimal separator.
    normalized =
      lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // Only commas: "1,234,567" is thousands; otherwise decimal comma.
    normalized = /^\d{1,3}(,\d{3}){2,}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    if ((normalized.match(/\./g) ?? []).length > 1) return null;
  } else if (lastDot >= 0) {
    // Only dots: "1.234" / "12.345.678" are thousands (Spanish style); "12.5" is decimal.
    normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
    if ((normalized.match(/\./g) ?? []).length > 1) return null;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return negative ? -cents : cents;
}

/** Format integer cents as "1.234,56 €". */
export function formatEuros(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${euros},${String(abs % 100).padStart(2, '0')} €`;
}

/**
 * Extract a year from a date-like cell: Date objects, "dd/mm/yyyy", "yyyy-mm-dd",
 * "dd-mm-yy" is rejected (ambiguous century), Excel serial numbers and bare years.
 */
export function parseYear(value: Cell): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getFullYear();
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 1990 && value <= 2100) return value;
    // Excel serial date (days since 1899-12-30) for 1990..2100.
    if (value > 32000 && value < 73000) {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      return new Date(ms).getUTCFullYear();
    }
    return null;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  let m = /^(\d{4})$/.exec(s);
  if (m) return plausible(Number(m[1]));
  m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return plausible(Number(m[1]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) return plausible(Number(m[3]));
  return null;
}

function plausible(year: number): number | null {
  return year >= 1990 && year <= 2100 ? year : null;
}

/** Interpret "sí", "x", "1", "true", "especie" as true. */
export function parseFlag(value: Cell): boolean {
  if (value === true) return true;
  if (value === null || value === undefined || value === false) return false;
  const s = String(value).trim().toLowerCase();
  return ['si', 'sí', 's', 'x', '1', 'true', 'yes', 'y', 'especie', 'en especie'].includes(s);
}

/** Cell to trimmed string. */
export function cellText(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}
