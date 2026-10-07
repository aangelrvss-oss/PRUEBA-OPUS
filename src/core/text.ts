/**
 * Text normalisation for AEAT fixed-width files.
 *
 * AEAT register design (Modelo 182): alphanumeric fields are "ajustados a la
 * izquierda y rellenos de blancos por la derecha, en mayúsculas, sin
 * caracteres especiales y sin vocales acentuadas". Ñ and Ç are allowed and
 * must be encoded in ISO-8859-1 (0xD1 and 0xC7).
 */

const KEEP = new Set(['Ñ', 'Ç']);

/** Characters allowed in AEAT alphanumeric fields after normalisation. */
const ALLOWED = /[A-Z0-9 .,\-_&'´:;/()ÑÇ]/;

/** Uppercase, strip accents (keeping Ñ/Ç), drop disallowed characters, collapse spaces. */
export function toAeatText(input: string): string {
  const upper = input.toUpperCase();
  let out = '';
  for (const ch of upper) {
    if (KEEP.has(ch)) {
      out += ch;
      continue;
    }
    // NFD splits "Á" into "A" + combining accent; keep only the base letter.
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const b of base) {
      if (ALLOWED.test(b)) out += b;
      else if (/\s/.test(b)) out += ' ';
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Left-align and pad with spaces to `length`, truncating if needed. */
export function alpha(value: string, length: number): string {
  const t = toAeatText(value);
  return t.length >= length ? t.slice(0, length) : t + ' '.repeat(length - t.length);
}

/** Right-align digits and pad with zeros to `length`. Throws if it does not fit. */
export function numeric(value: number | string, length: number): string {
  const s = typeof value === 'number' ? String(Math.trunc(value)) : value;
  if (!/^\d*$/.test(s)) throw new Error(`Valor numérico no válido: "${s}"`);
  if (s.length > length) throw new Error(`El valor ${s} no cabe en ${length} posiciones`);
  return s.padStart(length, '0');
}

/** NIF fields: right-aligned, zero-padded, last char is the control character. */
export function nifField(nif: string, length = 9): string {
  if (!nif) return ' '.repeat(length);
  if (nif.length > length) throw new Error(`NIF demasiado largo: ${nif}`);
  return nif.padStart(length, '0');
}

/** Normalise a header or free text for matching: lowercase, no accents, single spaces. */
export function fold(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Encode a string as ISO-8859-1 bytes. Characters outside Latin-1 become "?". */
export function encodeLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f;
  }
  return bytes;
}

/** Decode file bytes: strict UTF-8 first, then Windows-1252 (Excel's default "CSV" in Spain). */
export function decodeText(bytes: Uint8Array): { text: string; encoding: 'utf-8' | 'windows-1252' } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text: text.replace(/^﻿/, ''), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' };
  }
}
