/**
 * Spanish tax ID (NIF) validation: DNI, NIE, K/L/M NIFs and CIF-style NIFs
 * of legal entities. Pure checksum validation — whether the NIF exists in the
 * AEAT census can only be checked by AEAT when the file is imported.
 */

export type NifKind = 'DNI' | 'NIE' | 'KLM' | 'ENTITY';
/** Modelo 182 "NATURALEZA DEL DECLARADO": F persona física, J jurídica, E atribución de rentas. */
export type DonorNature = 'F' | 'J' | 'E';

export type NifResult =
  | { ok: true; nif: string; kind: NifKind; nature: DonorNature; note?: string }
  | { ok: false; input: string; reason: string };

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const ENTITY_LETTERS = 'ABCDEFGHJNPQRSUVW';
/** Entity types whose control character is always a letter. */
const CONTROL_LETTER_ONLY = 'KPQRSNW';
/** Entity types whose control character is always a digit. */
const CONTROL_DIGIT_ONLY = 'ABEH';
const CONTROL_LETTERS = 'JABCDEFGHI';

/** Remove separators and an optional "ES" VAT prefix; uppercase. */
export function cleanNif(raw: string): string {
  let s = raw.toUpperCase().replace(/[\s.\-_/]/g, '');
  if (/^ES[0-9A-Z]{9}$/.test(s)) s = s.slice(2);
  return s;
}

function dniLetter(num: number): string {
  return DNI_LETTERS[num % 23] as string;
}

export function validateNif(raw: string | null | undefined): NifResult {
  const input = (raw ?? '').toString();
  let s = cleanNif(input);
  if (!s) return { ok: false, input, reason: 'NIF vacío' };

  // DNI written without leading zeros, e.g. "1234567L" → "01234567L".
  if (/^\d{1,7}[A-Z]$/.test(s)) s = s.padStart(9, '0');

  if (/^\d{8}[A-Z]$/.test(s)) {
    const expected = dniLetter(Number(s.slice(0, 8)));
    return s[8] === expected
      ? { ok: true, nif: s, kind: 'DNI', nature: 'F' }
      : { ok: false, input, reason: `Letra de control incorrecta (debería ser ${expected})` };
  }

  if (/^[XYZ]\d{7}[A-Z]$/.test(s)) {
    const prefix = { X: '0', Y: '1', Z: '2' }[s[0] as 'X' | 'Y' | 'Z'];
    const expected = dniLetter(Number(prefix + s.slice(1, 8)));
    return s[8] === expected
      ? { ok: true, nif: s, kind: 'NIE', nature: 'F' }
      : { ok: false, input, reason: `Letra de control del NIE incorrecta (debería ser ${expected})` };
  }

  if (/^[KLM]\d{7}[A-Z]$/.test(s)) {
    const expected = dniLetter(Number(s.slice(1, 8)));
    return s[8] === expected
      ? { ok: true, nif: s, kind: 'KLM', nature: 'F' }
      : { ok: false, input, reason: `Letra de control incorrecta (debería ser ${expected})` };
  }

  if (/^[A-Z]\d{7}[0-9A-J]$/.test(s)) {
    const type = s[0] as string;
    if (!ENTITY_LETTERS.includes(type)) {
      return { ok: false, input, reason: `Letra inicial "${type}" no válida para un NIF de entidad` };
    }
    const digits = s.slice(1, 8);
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = Number(digits[i]);
      if (i % 2 === 0) {
        const doubled = d * 2;
        sum += Math.floor(doubled / 10) + (doubled % 10);
      } else {
        sum += d;
      }
    }
    const controlDigit = (10 - (sum % 10)) % 10;
    const controlLetter = CONTROL_LETTERS[controlDigit] as string;
    const control = s[8] as string;
    let valid: boolean;
    if (CONTROL_LETTER_ONLY.includes(type)) valid = control === controlLetter;
    else if (CONTROL_DIGIT_ONLY.includes(type)) valid = control === String(controlDigit);
    else valid = control === String(controlDigit) || control === controlLetter;
    if (!valid) return { ok: false, input, reason: 'Carácter de control del NIF de entidad incorrecto' };

    // E = comunidades de bienes, H = comunidades de propietarios: entidades en
    // régimen de atribución de rentas. J = sociedades civiles: usually also in
    // atribución, but some pay Corporate Tax, so flag it for review.
    if (type === 'E' || type === 'H') return { ok: true, nif: s, kind: 'ENTITY', nature: 'E' };
    if (type === 'J') {
      return {
        ok: true,
        nif: s,
        kind: 'ENTITY',
        nature: 'E',
        note: 'Sociedad civil: se declara como entidad en atribución de rentas (E). Si tributa por Sociedades, cámbiala a J.',
      };
    }
    return { ok: true, nif: s, kind: 'ENTITY', nature: 'J' };
  }

  return { ok: false, input, reason: 'Formato no reconocido como DNI, NIE o NIF de entidad' };
}

/** Compute a valid DNI from 8 digits (used by tests and the demo data generator). */
export function dniFromNumber(n: number): string {
  const digits = String(n).padStart(8, '0').slice(-8);
  return digits + dniLetter(Number(digits));
}
