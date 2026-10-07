import { describe, expect, it } from 'vitest';
import { buildDeclaration, composeName, extractRows, type DonationRow } from '../../src/core/engine';
import { detectMapping, mappingProblems } from '../../src/core/mapping';
import { dniFromNumber } from '../../src/core/nif';

const ANA = dniFromNumber(11111111);
const LUIS = dniFromNumber(22222222);
const MAR = dniFromNumber(33333333);

function row(over: Partial<DonationRow>): DonationRow {
  return {
    row: 2,
    source: 'test.csv',
    nifRaw: ANA,
    name: 'GARCIA LOPEZ ANA',
    amountCents: 1000,
    amountRaw: '10',
    year: 2025,
    postcode: '08001',
    provinceText: '',
    keyRaw: '',
    inKind: false,
    representativeNifRaw: '',
    ...over,
  };
}

describe('composeName', () => {
  it('builds "APELLIDOS NOMBRE" from separate columns or "Apellidos, Nombre"', () => {
    expect(composeName('', 'García López', 'Ana')).toBe('García López Ana');
    expect(composeName('García López, Ana', '', '')).toBe('García López Ana');
    expect(composeName('Fundación X', '', '')).toBe('Fundación X');
  });
});

describe('detectMapping', () => {
  it('recognises typical Spanish headers', () => {
    const m = detectMapping(['Fecha', 'DNI/NIE', 'Apellidos', 'Nombre', 'Importe (€)', 'C.P.', 'Provincia']);
    expect(m).toMatchObject({ date: 0, nif: 1, lastName: 2, firstName: 3, amount: 4, postcode: 5, province: 6 });
    expect(mappingProblems(m)).toEqual([]);
  });

  it('treats a lone "Nombre" column as the full name', () => {
    const m = detectMapping(['NIF', 'Nombre', 'Cantidad']);
    expect(m.fullName).toBe(1);
    expect(m.firstName).toBeUndefined();
  });

  it('reports missing essential columns', () => {
    expect(mappingProblems(detectMapping(['Fecha', 'Concepto'])).map((p) => p.field)).toEqual(['nif', 'amount', 'name']);
  });
});

describe('extractRows', () => {
  it('maps cells, skips empty rows and reads years from dates', () => {
    const rows = extractRows(
      [
        ['03/02/2025', ANA, 'García López, Ana', '25,00', '08001'],
        [null, null, null, null, null],
        ['2024-11-15', LUIS, 'Pérez Ruiz, Luis', 100, '28013'],
      ],
      { date: 0, nif: 1, fullName: 2, amount: 3, postcode: 4 },
      'f.csv',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ row: 2, name: 'García López Ana', amountCents: 2500, year: 2025 });
    expect(rows[1]).toMatchObject({ row: 4, year: 2024, amountCents: 10000 });
  });
});

describe('buildDeclaration', () => {
  it('aggregates payments per donor and key, and separates in-kind donations', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [
        row({ amountCents: 1000 }),
        row({ amountCents: 1500, row: 3 }),
        row({ amountCents: 5000, keyRaw: 'B', row: 4 }),
        row({ amountCents: 2000, inKind: true, row: 5 }),
      ],
      history: [],
    });
    expect(d.records).toHaveLength(3);
    const a = d.records.find((r) => r.key === 'A' && !r.inKind);
    expect(a?.amountCents).toBe(2500);
    expect(d.records.find((r) => r.key === 'B')?.percent).toBe(85);
    expect(d.records.find((r) => r.inKind)?.amountCents).toBe(2000);
    expect(d.stats.totalDeclaredCents).toBe(9500);
  });

  it('computes recurrence from history and uses it for the percentage above 250 €', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [row({ amountCents: 60000 }), row({ nifRaw: LUIS, name: 'PEREZ RUIZ LUIS', amountCents: 60000, row: 3 })],
      history: [
        { nif: ANA, year: 2023, amountCents: 50000, source: 'h' },
        { nif: ANA, year: 2024, amountCents: 60000, source: 'h' },
        { nif: LUIS, year: 2023, amountCents: 70000, source: 'h' },
        { nif: LUIS, year: 2024, amountCents: 60000, source: 'h' },
      ],
    });
    const ana = d.donors.find((x) => x.nif === ANA);
    const luis = d.donors.find((x) => x.nif === LUIS);
    expect(ana?.verdict.recurrent).toBe(true);
    expect(ana?.records[0]?.percent).toBe(45);
    expect(luis?.verdict.recurrent).toBe(false);
    expect(luis?.records[0]?.percent).toBe(40);
    expect(d.stats.recurrentDonors).toBe(1);
    expect(d.issues.some((i) => i.code === 'history-missing')).toBe(false);
  });

  it('uses earlier-year rows of the same sheet as history', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [
        row({ year: 2023, amountCents: 3000 }),
        row({ year: 2024, amountCents: 3000 }),
        row({ year: 2025, amountCents: 3000 }),
        row({ year: 2019, amountCents: 3000 }),
      ],
      history: [],
    });
    expect(d.donors[0]?.verdict.recurrent).toBe(true);
    expect(d.historyYears).toEqual([2023, 2024]);
    expect(d.issues.find((i) => i.code === 'year-ignored')?.message).toContain('2019');
  });

  it('warns loudly when there is no history', () => {
    const d = buildDeclaration({ year: 2025, rows: [row({})], history: [] });
    expect(d.issues[0]?.code).toBe('history-missing');
    expect(d.donors[0]?.verdict.recurrent).toBe(false);
  });

  it('excludes invalid or missing NIFs and reports them with rows and amounts', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [
        row({ nifRaw: '12345678A', amountCents: 1000, row: 7 }),
        row({ nifRaw: '12345678A', amountCents: 500, row: 9 }),
        row({ nifRaw: '', name: 'ANONIMO', amountCents: 2000, row: 8 }),
        row({}),
      ],
      history: [],
    });
    const bad = d.issues.find((i) => i.code === 'nif-invalid');
    expect(bad?.rows?.map((r) => r.row)).toEqual([7, 9]);
    expect(bad?.amountCents).toBe(1500);
    expect(d.issues.some((i) => i.code === 'nif-missing')).toBe(true);
    expect(d.records).toHaveLength(1);
    expect(d.stats.totalExcludedCents).toBe(3500);
  });

  it('blocks donors without province and explains the fix', () => {
    const d = buildDeclaration({ year: 2025, rows: [row({ postcode: '', provinceText: '' })], history: [] });
    expect(d.records).toHaveLength(0);
    expect(d.donors[0]?.included).toBe(false);
    expect(d.issues.find((i) => i.code === 'province-missing')?.action).toMatch(/código postal/);
  });

  it('nets refunds within the year and excludes non-positive totals', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [row({ amountCents: 3000 }), row({ amountCents: -3000, row: 3 })],
      history: [],
    });
    expect(d.records).toHaveLength(0);
    expect(d.issues.some((i) => i.code === 'amount-nonpositive')).toBe(true);
  });

  it('warns when the same NIF comes with different names, and uses the most frequent', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [row({ name: 'GARCIA ANA' }), row({ name: 'GARCIA LOPEZ ANA', row: 3 }), row({ name: 'GARCIA LOPEZ ANA', row: 4 })],
      history: [],
    });
    expect(d.records[0]?.name).toBe('GARCIA LOPEZ ANA');
    expect(d.issues.some((i) => i.code === 'name-mismatch')).toBe(true);
  });

  it('rejects unknown keys and invalid amounts row by row', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [row({ keyRaw: 'Z' }), row({ amountCents: null, amountRaw: 'diez', row: 3 }), row({ nifRaw: MAR, name: 'M', row: 4 })],
      history: [],
    });
    expect(d.issues.filter((i) => i.code === 'key-invalid')).toHaveLength(1);
    expect(d.issues.filter((i) => i.code === 'amount-invalid')).toHaveLength(1);
    expect(d.records).toHaveLength(1);
  });

  it('uses company percentages for legal entities', () => {
    const d = buildDeclaration({
      year: 2025,
      rows: [row({ nifRaw: 'B12345674', name: 'EMPRESA SL', amountCents: 10000 })],
      history: [],
    });
    expect(d.records[0]).toMatchObject({ nature: 'J', percent: 40 });
  });
});
