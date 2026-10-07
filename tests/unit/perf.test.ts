import { describe, expect, it } from 'vitest';
import { build182 } from '../../src/core/boe182';
import { buildDeclaration, extractRows } from '../../src/core/engine';
import { parseCsvText, splitHeader } from '../../src/core/files';
import { detectMapping } from '../../src/core/mapping';
import { dniFromNumber } from '../../src/core/nif';

/** A large entity: 5,000 monthly members (60,000 payment rows) plus two years of history. */
function bigCsv(): string {
  const lines = ['Fecha;DNI;Nombre;Importe;CP'];
  for (let i = 0; i < 5000; i++) {
    const nif = dniFromNumber(30000000 + i * 13);
    for (let m = 1; m <= 12; m++) lines.push(`01/${String(m).padStart(2, '0')}/2025;${nif};Socio ${i};12,50;28013`);
    lines.push(`01/06/2024;${nif};Socio ${i};150,00;28013`);
    lines.push(`01/06/2023;${nif};Socio ${i};150,00;28013`);
  }
  return lines.join('\n');
}

describe('performance', () => {
  it('parses, computes and writes 70,000 rows / 5,000 donors in well under 3 s', () => {
    const text = bigCsv();
    const t0 = performance.now();
    const { headers, rows } = splitHeader(parseCsvText(text));
    const t1 = performance.now();
    const d = buildDeclaration({ year: 2025, rows: extractRows(rows, detectMapping(headers), 'big.csv'), history: [] });
    const t2 = performance.now();
    const f = build182(d, { nif: 'G12345674', name: 'X', phone: '912345678', contactName: 'Y' });
    const t3 = performance.now();
    console.log(`parse ${(t1 - t0).toFixed(0)} ms · engine ${(t2 - t1).toFixed(0)} ms · write ${(t3 - t2).toFixed(0)} ms · ${f.lines.length} records`);
    expect(d.stats.donorsIncluded).toBe(5000);
    expect(d.stats.recurrentDonors).toBe(5000);
    expect(t3 - t0).toBeLessThan(3000);
  });
});
