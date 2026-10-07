import { describe, expect, it } from 'vitest';
import { cleanNif, dniFromNumber, validateNif } from '../../src/core/nif';

describe('validateNif', () => {
  it('accepts a valid DNI and marks it as an individual', () => {
    expect(validateNif('12345678Z')).toEqual({ ok: true, nif: '12345678Z', kind: 'DNI', nature: 'F' });
  });

  it('normalises separators, lowercase and the ES prefix', () => {
    expect(cleanNif(' es-12.345.678-z ')).toBe('12345678Z');
    const r = validateNif('12.345.678-z');
    expect(r.ok && r.nif).toBe('12345678Z');
  });

  it('pads DNIs written without leading zeros', () => {
    const dni = dniFromNumber(1234567); // 01234567 + letter
    const r = validateNif(dni.slice(1));
    expect(r.ok && r.nif).toBe(dni);
  });

  it('rejects a DNI with a wrong control letter and says which one is expected', () => {
    const r = validateNif('12345678A');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('Z');
  });

  it('validates NIEs with X, Y and Z prefixes', () => {
    expect(validateNif('X0000000T').ok).toBe(true);
    expect(validateNif('Y0000000Z').ok).toBe(true);
    expect(validateNif('X0000000A').ok).toBe(false);
  });

  it('validates entity NIFs and the digit/letter control rules', () => {
    expect(validateNif('A58818501')).toMatchObject({ ok: true, kind: 'ENTITY', nature: 'J' });
    expect(validateNif('B12345674').ok).toBe(true);
    // G (associations/foundations) accepts digit or letter control.
    expect(validateNif('G12345674').ok).toBe(true);
    expect(validateNif('G1234567D').ok).toBe(true);
    // Q only accepts a letter; B only a digit.
    expect(validateNif('Q1234567D').ok).toBe(true);
    expect(validateNif('Q12345674').ok).toBe(false);
    expect(validateNif('B1234567D').ok).toBe(false);
    expect(validateNif('B12345675').ok).toBe(false);
  });

  it('marks comunidades de bienes as income-attribution entities (E)', () => {
    expect(validateNif('E12345674')).toMatchObject({ ok: true, nature: 'E' });
    const j = validateNif('J12345674');
    expect(j).toMatchObject({ ok: true, nature: 'E' });
    if (j.ok) expect(j.note).toMatch(/Sociedad civil/);
  });

  it('rejects empty, malformed and unknown-prefix values', () => {
    expect(validateNif('').ok).toBe(false);
    expect(validateNif(null).ok).toBe(false);
    expect(validateNif('ABC').ok).toBe(false);
    expect(validateNif('I12345674').ok).toBe(false);
    expect(validateNif('123456789').ok).toBe(false);
  });
});
