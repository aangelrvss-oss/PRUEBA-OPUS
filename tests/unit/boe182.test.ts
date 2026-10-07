import { describe, expect, it } from 'vitest';
import { build182, declaredRecord, entityProblems, looksLike182, parse182, type EntityInfo } from '../../src/core/boe182';
import { buildDeclaration, type DonationRow } from '../../src/core/engine';
import { dniFromNumber } from '../../src/core/nif';

const ENTITY: EntityInfo = {
  nif: 'G12345674',
  name: 'Fundación Ñandú Solidaria',
  phone: '912 345 678',
  contactName: 'Pérez Gómez Lucía',
};
const ANA = dniFromNumber(11111111);

/** Slice a record by 1-based inclusive positions, as in the AEAT design. */
const pos = (rec: string, from: number, to: number) => rec.slice(from - 1, to);

function row(over: Partial<DonationRow>): DonationRow {
  return {
    row: 2, source: 't', nifRaw: ANA, name: 'García López Ana', amountCents: 30050, amountRaw: '',
    year: 2025, dateText: '', postcode: '08001', provinceText: '', keyRaw: '', inKind: false, representativeNifRaw: '',
    ...over,
  };
}

describe('entityProblems', () => {
  it('accepts a complete entity', () => {
    expect(entityProblems(ENTITY)).toEqual([]);
  });
  it('rejects individuals as declarants, bad phones and missing contact', () => {
    const p = entityProblems({ nif: ANA, name: '', phone: '123', contactName: '' });
    expect(p.map((x) => x.field)).toEqual(['nif', 'name', 'phone', 'contactName']);
  });
  it('requires the previous receipt for complementary returns', () => {
    expect(entityProblems({ ...ENTITY, replacement: 'C' }).map((x) => x.field)).toEqual(['previousReceiptNumber']);
  });
});

describe('build182', () => {
  const decl = buildDeclaration({
    year: 2025,
    rows: [
      row({}),
      row({ nifRaw: 'B12345674', name: 'Empresa Ejemplo SL', amountCents: 100000, keyRaw: 'B', postcode: '28013', row: 3 }),
    ],
    history: [
      { nif: ANA, year: 2023, amountCents: 30000, source: 'h' },
      { nif: ANA, year: 2024, amountCents: 30050, source: 'h' },
    ],
  });
  const built = build182(decl, ENTITY);
  const [t1, ...t2] = built.lines;

  it('writes 250-character records separated by CRLF', () => {
    expect(built.lines).toHaveLength(3);
    for (const l of built.lines) expect(l).toHaveLength(250);
    expect(built.text.endsWith('\r\n')).toBe(true);
    expect(built.text.split('\r\n')).toHaveLength(4);
    expect(built.fileName).toBe('182_2025_G12345674.txt');
  });

  it('fills the declarant record (type 1) according to the design', () => {
    expect(pos(t1!, 1, 1)).toBe('1');
    expect(pos(t1!, 2, 4)).toBe('182');
    expect(pos(t1!, 5, 8)).toBe('2025');
    expect(pos(t1!, 9, 17)).toBe('G12345674');
    expect(pos(t1!, 18, 57).trimEnd()).toBe('FUNDACION ÑANDU SOLIDARIA');
    expect(pos(t1!, 58, 58)).toBe('T');
    expect(pos(t1!, 59, 67)).toBe('912345678');
    expect(pos(t1!, 68, 107).trimEnd()).toBe('PEREZ GOMEZ LUCIA');
    expect(pos(t1!, 108, 120)).toBe('1820000000000');
    expect(pos(t1!, 121, 122)).toBe('  ');
    expect(pos(t1!, 123, 135)).toBe('0000000000000');
    expect(pos(t1!, 136, 144)).toBe('000000002');
    expect(pos(t1!, 145, 159)).toBe('0000000001300' + '50'); // 300,50 + 1.000,00
    expect(pos(t1!, 145, 159)).toHaveLength(15);
    expect(pos(t1!, 160, 160)).toBe('1');
    expect(pos(t1!, 161, 250).trim()).toBe('');
  });

  it('fills declared records (type 2) according to the design', () => {
    const ana = t2.find((l) => pos(l, 18, 26) === ANA)!;
    expect(pos(ana, 1, 4)).toBe('2182');
    expect(pos(ana, 9, 17)).toBe('G12345674');
    expect(pos(ana, 27, 35)).toBe('         ');
    expect(pos(ana, 36, 75).trimEnd()).toBe('GARCIA LOPEZ ANA');
    expect(pos(ana, 76, 77)).toBe('08');
    expect(pos(ana, 78, 78)).toBe('A');
    expect(pos(ana, 79, 83)).toBe('04500'); // recurrent, above 250 € → 45,00 %
    expect(pos(ana, 84, 96)).toBe('0000000030050');
    expect(pos(ana, 97, 97)).toBe(' ');
    expect(pos(ana, 98, 104)).toBe('0000000');
    expect(pos(ana, 105, 105)).toBe('F');
    expect(pos(ana, 106, 106)).toBe(' ');
    expect(pos(ana, 107, 110)).toBe('0000');
    expect(pos(ana, 132, 132)).toBe('1');
    expect(pos(ana, 133, 250).trim()).toBe('');

    const company = t2.find((l) => pos(l, 18, 26) === 'B12345674')!;
    expect(pos(company, 76, 77)).toBe('28');
    expect(pos(company, 78, 78)).toBe('B');
    expect(pos(company, 79, 83)).toBe('04500');
    expect(pos(company, 105, 105)).toBe('J');
    expect(pos(company, 132, 132)).toBe('2');
  });

  it('encodes the file as ISO-8859-1 (one byte per character)', () => {
    expect(built.bytes.length).toBe(built.text.length);
    expect(built.bytes.includes(0xd1)).toBe(true); // Ñ
  });

  it('marks in-kind donations and representatives', () => {
    const rec = declaredRecord(2025, 'G12345674', {
      nif: ANA, representativeNif: dniFromNumber(44444444), name: 'X', province: '46', key: 'A',
      percent: 80, amountCents: 1, inKind: true, nature: 'F', recurrent: false,
    });
    expect(pos(rec, 27, 35)).toBe(dniFromNumber(44444444));
    expect(pos(rec, 79, 83)).toBe('08000');
    expect(pos(rec, 84, 96)).toBe('0000000000001');
    expect(pos(rec, 97, 97)).toBe('X');
    expect(pos(rec, 132, 132)).toBe('2');
  });
});

describe('parse182 (history from previous files)', () => {
  const decl = buildDeclaration({
    year: 2024,
    rows: [row({ year: 2024 }), row({ year: 2024, keyRaw: 'B', amountCents: 1000, row: 3 })],
    history: [],
  });
  const text = build182(decl, ENTITY).text;

  it('round-trips a generated file into per-donor yearly totals', () => {
    expect(looksLike182(text)).toBe(true);
    const parsed = parse182(text, 'prev.txt');
    expect(parsed.year).toBe(2024);
    expect(parsed.declarantNif).toBe('G12345674');
    expect(parsed.recordCount).toBe(2);
    expect(parsed.entries).toEqual([{ nif: ANA, year: 2024, amountCents: 31050, source: 'prev.txt' }]);
  });

  it('reads files without line breaks and ignores revocations', () => {
    const lines = text.split('\r\n').filter(Boolean);
    const revoked = lines[1]!.slice(0, 105) + 'X' + lines[1]!.slice(106);
    const parsed = parse182([lines[0], revoked, lines[2]].join(''), 'p');
    expect(parsed.entries[0]?.amountCents).toBe(1000);
  });

  it('does not mistake a CSV for a 182 file', () => {
    expect(looksLike182('NIF;Nombre;Importe\n12345678Z;Ana;10')).toBe(false);
  });
});
