import { describe, expect, it } from 'vitest';
import { parseCsvText, splitHeader } from '../../src/core/files';

describe('CSV parsing', () => {
  it('detects semicolon delimiters used by Spanish Excel', () => {
    const data = parseCsvText('NIF;Nombre;Importe\n12345678Z;"García; Ana";10,50\n');
    expect(data).toEqual([
      ['NIF', 'Nombre', 'Importe'],
      ['12345678Z', 'García; Ana', '10,50'],
    ]);
  });

  it('detects comma delimiters', () => {
    expect(parseCsvText('nif,importe\nX,1\n')[1]).toEqual(['X', '1']);
  });
});

describe('splitHeader', () => {
  it('skips title rows above the real header', () => {
    const { headers, rows, headerRow } = splitHeader([
      ['Donativos 2025 — Asociación Ejemplo'],
      [],
      ['Fecha', 'DNI', 'Nombre', 'Importe'],
      ['01/01/2025', '12345678Z', 'Ana', 10],
    ]);
    expect(headerRow).toBe(2);
    expect(headers).toEqual(['Fecha', 'DNI', 'Nombre', 'Importe']);
    expect(rows).toHaveLength(1);
  });

  it('names blank header cells', () => {
    expect(splitHeader([['NIF', '', 'Importe']]).headers).toEqual(['NIF', 'Columna 2', 'Importe']);
  });

  it('throws on empty files', () => {
    expect(() => splitHeader([[], ['', null]])).toThrow(/vacío/);
  });
});
