import { describe, expect, it } from 'vitest';
import { buildDeclaration, extractRows, type DonationRow } from '../../src/core/engine';
import type { TableFile } from '../../src/core/files';
import { givenFirstToSurnameFirst, guessNameOrder } from '../../src/core/names';
import { dniFromNumber } from '../../src/core/nif';
import { duplicatesAcrossFiles, makeSource, runWorkflow } from '../../src/core/workflow';

const ANA = dniFromNumber(11111111);

describe('name order', () => {
  it('reorders "Nombre Apellidos" into "Apellidos Nombre", including compound given names', () => {
    expect(givenFirstToSurnameFirst('José Núñez Peña')).toBe('Núñez Peña José');
    expect(givenFirstToSurnameFirst('José Luis Núñez Peña')).toBe('Núñez Peña José Luis');
    expect(givenFirstToSurnameFirst('María del Carmen Ruiz Gil')).toBe('Ruiz Gil María del Carmen');
    expect(givenFirstToSurnameFirst('Ana')).toBe('Ana');
  });

  it('detects given-name-first columns and leaves surname-first columns alone', () => {
    expect(guessNameOrder(['Ana García López', 'Luis Pérez Ruiz', 'Marta Gil Sanz', 'Pedro Ruiz']).givenFirst).toBe(true);
    expect(guessNameOrder(['García López Ana', 'Pérez Ruiz Luis', 'Gil Sanz Marta', 'Ruiz Pedro']).givenFirst).toBe(false);
    expect(guessNameOrder(['García López, Ana', 'Pérez, Luis']).checked).toBe(0);
  });

  it('only reorders individuals (companies keep their name)', () => {
    const rows = extractRows(
      [[ANA, 'Ana García López', 10], ['B12345674', 'Ana Talleres SL', 10]],
      { nif: 0, fullName: 1, amount: 2 },
      'f',
      { givenFirst: true },
    );
    expect(rows.map((r) => r.name)).toEqual(['García López Ana', 'Ana Talleres SL']);
  });

  it('makeSource turns reordering on when the column looks given-name-first', () => {
    const file: TableFile = {
      kind: 'table', name: 'x.csv', headers: ['NIF', 'Nombre completo', 'Importe'], headerRow: 0,
      rows: [[ANA, 'Ana García', 1], [ANA, 'Luis Pérez', 1], [ANA, 'Marta Gil', 1]],
    };
    expect(makeSource('a', file).givenFirst).toBe(true);
  });
});

function row(over: Partial<DonationRow>): DonationRow {
  return {
    row: 2, source: 'a.csv', nifRaw: ANA, name: 'GARCIA ANA', amountCents: 1000, amountRaw: '', year: 2025,
    dateText: '01/02/2025', postcode: '08001', provinceText: '', keyRaw: '', inKind: false, representativeNifRaw: '',
    ...over,
  };
}

describe('micro-patronage threshold uses the donor total', () => {
  it('a donor with 200 € cash + 100 € in kind is above 250 € on both records', () => {
    const d = buildDeclaration({ year: 2025, rows: [row({ amountCents: 20000 }), row({ amountCents: 10000, inKind: true })], history: [] });
    expect(d.records.map((r) => r.percent)).toEqual([40, 40]);
  });
});

describe('duplicates across files', () => {
  it('flags the same payment present in two files, but not repeated payments in one file', () => {
    expect(duplicatesAcrossFiles([row({}), row({ source: 'b.csv' })])).toEqual({ count: 1, files: ['a.csv', 'b.csv'] });
    expect(duplicatesAcrossFiles([row({}), row({ row: 3 })]).count).toBe(0);
  });

  it('runWorkflow surfaces it as a warning', () => {
    const file = (name: string): TableFile => ({
      kind: 'table', name, headers: ['Fecha', 'NIF', 'Nombre', 'Importe', 'CP'], headerRow: 0,
      rows: [['01/02/2025', ANA, 'García Ana', '10', '08001']],
    });
    const r = runWorkflow([makeSource('a', file('a.csv')), makeSource('b', file('b.csv'))], 2025);
    expect(r.declaration.issues[0]?.code).toBe('duplicate-across-files');
    expect(r.declaration.records[0]?.amountCents).toBe(2000);
  });
});

import { donorReportCsv, historyCsv, neutralizeFormula } from '../../src/core/exports';

describe('CSV exports', () => {
  it('neutralises spreadsheet formulas in text but keeps negative numbers', () => {
    expect(neutralizeFormula('=HYPERLINK("http://x","clic")')).toBe('\'=HYPERLINK("http://x","clic")');
    expect(neutralizeFormula('+34 600')).toBe("'+34 600");
    expect(neutralizeFormula('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(neutralizeFormula('-cmd')).toBe("'-cmd");
    expect(neutralizeFormula('-20,00')).toBe('-20,00');
    expect(neutralizeFormula('García')).toBe('García');
  });

  it('writes Excel-friendly review and history files', () => {
    const d = buildDeclaration({ year: 2025, rows: [row({ name: '=EVIL()', amountCents: 30000 })], history: [{ nif: ANA, year: 2024, amountCents: 1000, source: 'h' }] });
    const report = donorReportCsv(d);
    expect(report.startsWith('﻿NIF;Nombre')).toBe(true);
    expect(report).toContain("'=EVIL()");
    expect(report).toContain('300,00');
    const hist = historyCsv(d);
    expect(hist).toContain(`${ANA};'=EVIL();2024;10,00`);
    expect(hist).toContain(`${ANA};'=EVIL();2025;300,00`);
  });
});
