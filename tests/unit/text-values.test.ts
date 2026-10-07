import { describe, expect, it } from 'vitest';
import { alpha, decodeText, encodeLatin1, nifField, numeric, toAeatText } from '../../src/core/text';
import { formatEuros, parseAmountCents, parseFlag, parseYear } from '../../src/core/values';
import { provinceFromPostcode, provinceFromText } from '../../src/core/provinces';

describe('AEAT text rules', () => {
  it('uppercases, removes accents but keeps Ñ and Ç, drops special characters', () => {
    expect(toAeatText('José Ñúñez, Çà! «Fundación»')).toBe('JOSE ÑUÑEZ, ÇA FUNDACION');
    expect(toAeatText('  María   del   Mar  ')).toBe('MARIA DEL MAR');
  });

  it('pads and truncates alphanumeric fields', () => {
    expect(alpha('Ana', 5)).toBe('ANA  ');
    expect(alpha('Fundación Muy Larga', 8)).toBe('FUNDACIO');
  });

  it('zero-pads numeric fields and refuses overflow or non-digits', () => {
    expect(numeric(42, 5)).toBe('00042');
    expect(() => numeric(123456, 5)).toThrow();
    expect(() => numeric('12a', 5)).toThrow();
  });

  it('right-aligns NIFs with zeros', () => {
    expect(nifField('12345678Z')).toBe('12345678Z');
    expect(nifField('')).toBe('         ');
  });

  it('encodes Ñ and Ç as ISO-8859-1 bytes 0xD1 and 0xC7', () => {
    expect([...encodeLatin1('ÑÇA')]).toEqual([0xd1, 0xc7, 0x41]);
  });

  it('decodes UTF-8 and falls back to Windows-1252', () => {
    expect(decodeText(new TextEncoder().encode('﻿Año')).text).toBe('Año');
    const cp1252 = new Uint8Array([0x41, 0xf1, 0x6f]); // "Año" in Windows-1252
    expect(decodeText(cp1252)).toEqual({ text: 'Año', encoding: 'windows-1252' });
  });
});

describe('amounts', () => {
  it.each([
    ['30', 3000],
    ['30,5', 3050],
    ['1.234,56 €', 123456],
    ['1,234.56', 123456],
    ['1.234', 123400],
    ['12.50', 1250],
    ['-20,00', -2000],
    ['(15,00)', -1500],
    ['1 200,00', 120000],
    ['EUR 10', 1000],
  ])('parses %s', (input, cents) => {
    expect(parseAmountCents(input)).toBe(cents);
  });

  it('parses numbers and rejects text', () => {
    expect(parseAmountCents(19.99)).toBe(1999);
    expect(parseAmountCents('diez')).toBeNull();
    expect(parseAmountCents('')).toBeNull();
    expect(parseAmountCents('1.2.3,4,5')).toBeNull();
  });

  it('formats euros the Spanish way', () => {
    expect(formatEuros(123456)).toBe('1.234,56 €');
    expect(formatEuros(-500)).toBe('-5,00 €');
  });
});

describe('years and flags', () => {
  it('reads years from dates, strings, Excel serials and bare years', () => {
    expect(parseYear(new Date(2025, 4, 3))).toBe(2025);
    expect(parseYear('03/05/2025')).toBe(2025);
    expect(parseYear('2024-12-31')).toBe(2024);
    expect(parseYear(2023)).toBe(2023);
    expect(parseYear('2026')).toBe(2026);
    expect(parseYear(45658)).toBe(2025); // 2025-01-01 as an Excel serial
    expect(parseYear('03/05/25')).toBeNull();
    expect(parseYear('ayer')).toBeNull();
  });

  it('reads yes/no flags', () => {
    expect(parseFlag('Sí')).toBe(true);
    expect(parseFlag('x')).toBe(true);
    expect(parseFlag('no')).toBe(false);
    expect(parseFlag(null)).toBe(false);
  });
});

describe('provinces', () => {
  it('maps postcodes to province codes', () => {
    expect(provinceFromPostcode('08001')).toBe('08');
    expect(provinceFromPostcode(8001)).toBe('08');
    expect(provinceFromPostcode('28013')).toBe('28');
    expect(provinceFromPostcode('99999')).toBeNull();
    expect(provinceFromPostcode('ABC')).toBeNull();
  });

  it('maps names, aliases and codes', () => {
    expect(provinceFromText('Gerona')).toBe('17');
    expect(provinceFromText('València')).toBe('46');
    expect(provinceFromText('A Coruña')).toBe('15');
    expect(provinceFromText('La Coruña')).toBe('15');
    expect(provinceFromText('Vizcaya')).toBe('48');
    expect(provinceFromText('Illes Balears')).toBe('07');
    expect(provinceFromText('Las Palmas')).toBe('35');
    expect(provinceFromText('8')).toBe('08');
    expect(provinceFromText('extranjero')).toBe('99');
    expect(provinceFromText('Atlántida')).toBeNull();
  });
});
