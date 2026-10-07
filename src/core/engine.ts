import type { ColumnMapping } from './mapping';
import { givenFirstToSurnameFirst } from './names';
import { validateNif, type DonorNature } from './nif';
import { PROVINCES, provinceFromPostcode, provinceFromText } from './provinces';
import { deductionPercent, recurrence, type DonationKey, type RecurrenceVerdict, type YearTotals } from './rules';
import { cellText, parseAmountCents, parseFlag, parseYear, type Cell } from './values';

/* ------------------------------------------------------------------ */
/* Input rows                                                          */
/* ------------------------------------------------------------------ */

export interface DonationRow {
  /** 1-based row number in the source sheet (header = row 1). */
  row: number;
  source: string;
  nifRaw: string;
  name: string;
  amountCents: number | null;
  amountRaw: string;
  year: number | null;
  /** Date or year cell as text, used to spot the same payment loaded twice. */
  dateText: string;
  postcode: string;
  provinceText: string;
  keyRaw: string;
  inKind: boolean;
  representativeNifRaw: string;
}

/** Build a 182-style name: "APELLIDOS NOMBRE". "García López, Ana" is reordered. */
export function composeName(full: string, last: string, first: string): string {
  if (last || first) return [last, first].filter(Boolean).join(' ').trim();
  const comma = full.indexOf(',');
  if (comma > 0) return `${full.slice(0, comma).trim()} ${full.slice(comma + 1).trim()}`.trim();
  return full.trim();
}

const PERSON_NIF = /^\s*[0-9XYZKLMxyzklm]/;

/**
 * Turn sheet rows (without the header) into DonationRows using a column mapping.
 * `givenFirst`: the full-name column is written "Nombre Apellidos"; reorder it
 * for individuals to the "Apellidos Nombre" order AEAT requires.
 */
export function extractRows(rows: Cell[][], mapping: ColumnMapping, source: string, opts: { givenFirst?: boolean } = {}): DonationRow[] {
  const get = (r: Cell[], k: keyof ColumnMapping): Cell =>
    mapping[k] === undefined ? null : r[mapping[k] as number];
  const out: DonationRow[] = [];
  rows.forEach((r, i) => {
    if (!r || r.every((c) => c === null || c === undefined || String(c).trim() === '')) return;
    const amountCell = get(r, 'amount');
    const yearFromCol = parseYear(get(r, 'year'));
    const full = cellText(get(r, 'fullName'));
    const nifText = cellText(get(r, 'nif'));
    const fullOrdered = opts.givenFirst && full && !full.includes(',') && PERSON_NIF.test(nifText) ? givenFirstToSurnameFirst(full) : full;
    out.push({
      row: i + 2,
      source,
      nifRaw: nifText,
      name: composeName(fullOrdered, cellText(get(r, 'lastName')), cellText(get(r, 'firstName'))),
      amountCents: parseAmountCents(amountCell),
      amountRaw: cellText(amountCell),
      year: yearFromCol ?? parseYear(get(r, 'date')),
      dateText: cellText(get(r, 'date')) || cellText(get(r, 'year')),
      postcode: cellText(get(r, 'postcode')),
      provinceText: cellText(get(r, 'province')),
      keyRaw: cellText(get(r, 'key')),
      inKind: parseFlag(get(r, 'inKind')),
      representativeNifRaw: cellText(get(r, 'representativeNif')),
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

export interface HistoryEntry {
  nif: string;
  year: number;
  amountCents: number;
  source: string;
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  code: string;
  message: string;
  action: string;
  nif?: string;
  name?: string;
  rows?: { source: string; row: number }[];
  amountCents?: number;
}

export interface Record182 {
  nif: string;
  representativeNif: string;
  name: string;
  province: string;
  key: DonationKey;
  percent: number;
  amountCents: number;
  inKind: boolean;
  nature: DonorNature;
  recurrent: boolean;
}

export interface DonorResult {
  nif: string;
  name: string;
  nature: DonorNature;
  province: string | null;
  totalCents: number;
  /** Totals by year for the current year and the two previous ones. */
  totals: YearTotals;
  verdict: RecurrenceVerdict;
  records: Record182[];
  included: boolean;
  /** Why the donor is not in the file, when `included` is false. */
  blockedBy?: string;
  notes: string[];
  rowCount: number;
}

export interface Declaration {
  year: number;
  donors: DonorResult[];
  records: Record182[];
  issues: Issue[];
  historyYears: number[];
  stats: {
    rowsRead: number;
    rowsUsed: number;
    donorsIncluded: number;
    donorsExcluded: number;
    recurrentDonors: number;
    totalDeclaredCents: number;
    totalExcludedCents: number;
  };
}

export interface BuildInput {
  year: number;
  rows: DonationRow[];
  history: HistoryEntry[];
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

function parseKey(raw: string): DonationKey | null {
  const s = raw.trim().toUpperCase();
  if (s === '' || s === 'A' || s === 'NO' || s === 'N' || s === 'GENERAL') return 'A';
  if (s === 'B' || s === 'SI' || s === 'SÍ' || s === 'S' || s === 'X' || s.startsWith('PRIORITAR')) return 'B';
  return null;
}

interface DonorAcc {
  nif: string;
  nature: DonorNature;
  nifNote?: string;
  names: Map<string, number>;
  rowsByName: Map<string, { source: string; row: number }[]>;
  provinces: string[];
  representative: string;
  buckets: Map<string, { key: DonationKey; inKind: boolean; cents: number }>;
  rows: { source: string; row: number }[];
}

export function buildDeclaration(input: BuildInput): Declaration {
  const { year } = input;
  const issues: Issue[] = [];
  const donors = new Map<string, DonorAcc>();
  const totalsByNif = new Map<string, YearTotals>();
  const historyYears = new Set<number>();
  let rowsUsed = 0;
  let totalExcludedCents = 0;

  const addTotal = (nif: string, y: number, cents: number) => {
    const t = totalsByNif.get(nif) ?? {};
    t[y] = (t[y] ?? 0) + cents;
    totalsByNif.set(nif, t);
  };

  for (const h of input.history) {
    historyYears.add(h.year);
    addTotal(h.nif, h.year, h.amountCents);
  }

  const invalidNif = new Map<string, Issue>();
  const otherYears = new Map<number, number>();
  const rowsWithoutYear: { source: string; row: number }[] = [];

  for (const r of input.rows) {
    const where = { source: r.source, row: r.row };

    if (r.amountCents === null) {
      issues.push({
        severity: 'error',
        code: 'amount-invalid',
        message: `Importe no válido: "${r.amountRaw || '(vacío)'}".`,
        action: 'Corrige el importe en tu hoja y vuelve a cargarla.',
        name: r.name,
        rows: [where],
      });
      continue;
    }

    const rowYear = r.year ?? year;
    if (r.year === null) rowsWithoutYear.push(where);

    const nif = validateNif(r.nifRaw);
    if (!nif.ok) {
      if (rowYear === year) {
        const k = `${r.nifRaw}|${r.name}`;
        const prev = invalidNif.get(k);
        if (prev) {
          prev.rows?.push(where);
          prev.amountCents = (prev.amountCents ?? 0) + r.amountCents;
        } else {
          invalidNif.set(k, {
            severity: 'error',
            code: r.nifRaw ? 'nif-invalid' : 'nif-missing',
            message: r.nifRaw ? `NIF "${r.nifRaw}" no válido: ${nif.reason}.` : 'Donativo sin NIF.',
            action: r.nifRaw
              ? 'Revisa el NIF con el donante. Sin un NIF válido no se puede declarar y el donante no podrá deducirse.'
              : 'Pide el NIF al donante. Los donativos sin NIF no se declaran y no generan deducción.',
            name: r.name,
            rows: [where],
            amountCents: r.amountCents,
          });
        }
        totalExcludedCents += r.amountCents;
      }
      continue;
    }

    if (rowYear !== year) {
      if (rowYear === year - 1 || rowYear === year - 2) {
        historyYears.add(rowYear);
        addTotal(nif.nif, rowYear, r.amountCents);
        rowsUsed++;
      } else {
        otherYears.set(rowYear, (otherYears.get(rowYear) ?? 0) + 1);
      }
      continue;
    }

    const key = parseKey(r.keyRaw);
    if (key === null) {
      issues.push({
        severity: 'error',
        code: 'key-invalid',
        message: `Clave "${r.keyRaw}" no reconocida. Cuadra admite A (general) y B (actividad prioritaria de mecenazgo).`,
        action: 'Usa A o B en la columna de clave, o déjala vacía para A.',
        nif: nif.nif,
        name: r.name,
        rows: [where],
      });
      continue;
    }

    rowsUsed++;
    addTotal(nif.nif, year, r.amountCents);
    let acc = donors.get(nif.nif);
    if (!acc) {
      acc = {
        nif: nif.nif,
        nature: nif.nature,
        nifNote: nif.note,
        names: new Map(),
        rowsByName: new Map(),
        provinces: [],
        representative: '',
        buckets: new Map(),
        rows: [],
      };
      donors.set(nif.nif, acc);
    }
    if (r.name) {
      acc.names.set(r.name, (acc.names.get(r.name) ?? 0) + 1);
      acc.rowsByName.set(r.name, [...(acc.rowsByName.get(r.name) ?? []), where]);
    }
    const prov = provinceFromText(r.provinceText) ?? provinceFromPostcode(r.postcode);
    if (prov) acc.provinces.push(prov);
    if (r.representativeNifRaw) acc.representative = r.representativeNifRaw;
    const bucketKey = `${key}|${r.inKind ? 'K' : 'C'}`;
    const bucket = acc.buckets.get(bucketKey) ?? { key, inKind: r.inKind, cents: 0 };
    bucket.cents += r.amountCents;
    acc.buckets.set(bucketKey, bucket);
    acc.rows.push(where);
  }

  issues.push(...invalidNif.values());

  if (rowsWithoutYear.length > 0) {
    issues.push({
      severity: 'info',
      code: 'year-assumed',
      message: `${rowsWithoutYear.length} fila(s) sin fecha ni ejercicio se han tratado como donativos de ${year}.`,
      action: 'Si alguna corresponde a otro año, añade una columna de fecha o de ejercicio.',
      rows: rowsWithoutYear.slice(0, 50),
    });
  }
  for (const [y, n] of otherYears) {
    issues.push({
      severity: 'info',
      code: 'year-ignored',
      message: `${n} fila(s) de ${y} se han ignorado: solo cuentan ${year}, ${year - 1} y ${year - 2}.`,
      action: 'No necesitas hacer nada.',
    });
  }

  const results: DonorResult[] = [];
  const records: Record182[] = [];

  for (const acc of donors.values()) {
    const notes: string[] = [];
    const names = [...acc.names.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    const name = names[0]?.[0] ?? '';
    if (names.length > 1) {
      issues.push({
        severity: 'warning',
        code: 'name-mismatch',
        message: `El mismo NIF aparece con ${names.length} nombres distintos (${names.map((n) => `"${n[0]}"`).join(', ')}).`,
        action: `Se usará "${name}". Comprueba que no son dos personas distintas con un NIF equivocado.`,
        nif: acc.nif,
        name,
        // Point at the rows with the less frequent names: those are the suspicious ones.
        rows: names.slice(1).flatMap(([n]) => acc.rowsByName.get(n) ?? []),
      });
    }
    if (acc.nifNote) notes.push(acc.nifNote);
    if (acc.nature === 'E' && !acc.nifNote) {
      notes.push('Entidad en atribución de rentas: se aplican los porcentajes de personas físicas.');
    }

    const provinceSet = new Set(acc.provinces);
    const province = acc.provinces[acc.provinces.length - 1] ?? null;
    if (provinceSet.size > 1) notes.push(`Aparece en varias provincias; se usa la del último donativo (${PROVINCES[province as string] ?? province}).`);

    let representative = '';
    if (acc.representative) {
      const rep = validateNif(acc.representative);
      if (rep.ok) representative = rep.nif;
      else {
        issues.push({
          severity: 'warning',
          code: 'representative-invalid',
          message: `NIF del representante legal "${acc.representative}" no válido: ${rep.reason}.`,
          action: 'Corrígelo si el donante es menor de 14 años; si no lo es, deja la columna vacía.',
          nif: acc.nif,
          name,
          rows: acc.rows,
        });
      }
    }

    const totals = totalsByNif.get(acc.nif) ?? {};
    const totalCents = totals[year] ?? 0;
    const verdict = recurrence(year, totals, historyYears);
    const donorRecords: Record182[] = [];
    let blockedBy: string | undefined;

    if (!name) blockedBy = 'Sin nombre.';
    else if (!province) blockedBy = 'Sin provincia ni código postal.';
    else if (totalCents <= 0) blockedBy = 'El importe neto del año es cero o negativo.';

    if (!blockedBy) {
      // The micro-patronage threshold applies to the donor's deduction base (all
      // their deductible donations to the entity in the year), not to each record.
      const base = [...acc.buckets.values()].reduce((sum, b) => sum + Math.max(b.cents, 0), 0);
      for (const b of [...acc.buckets.values()].sort((x, y) => x.key.localeCompare(y.key) || Number(x.inKind) - Number(y.inKind))) {
        if (b.cents <= 0) {
          if (b.cents < 0) {
            notes.push(`Importe negativo en clave ${b.key}${b.inKind ? ' (especie)' : ''}: no se declara ese registro.`);
          }
          continue;
        }
        donorRecords.push({
          nif: acc.nif,
          representativeNif: representative,
          name,
          province: province as string,
          key: b.key,
          percent: deductionPercent(acc.nature, b.key, base, verdict.recurrent),
          amountCents: b.cents,
          inKind: b.inKind,
          nature: acc.nature,
          recurrent: verdict.recurrent,
        });
      }
      if (donorRecords.length === 0) blockedBy = 'Ningún importe positivo que declarar.';
    }

    if (blockedBy) {
      totalExcludedCents += Math.max(totalCents, 0);
      issues.push({
        severity: 'error',
        code: !province ? 'province-missing' : !name ? 'name-missing' : 'amount-nonpositive',
        message: `${name || acc.nif}: no se puede declarar. ${blockedBy}`,
        action: !province
          ? 'Añade el código postal o la provincia del donante en tu hoja. Si vive fuera de España, escribe «Extranjero» en la columna de provincia.'
          : !name
            ? 'Añade el nombre del donante en tu hoja.'
            : 'Revisa si hubo devoluciones. Las revocaciones de años anteriores no las gestiona Cuadra.',
        nif: acc.nif,
        name,
        rows: acc.rows,
        amountCents: totalCents,
      });
    }

    records.push(...donorRecords);
    results.push({
      nif: acc.nif,
      name,
      nature: acc.nature,
      province,
      totalCents,
      totals: { [year - 2]: totals[year - 2] ?? 0, [year - 1]: totals[year - 1] ?? 0, [year]: totalCents },
      verdict,
      records: donorRecords,
      included: !blockedBy,
      blockedBy,
      notes,
      rowCount: acc.rows.length,
    });
  }

  const missingYears = [year - 2, year - 1].filter((y) => !historyYears.has(y));
  if (missingYears.length > 0 && results.length > 0) {
    issues.unshift({
      severity: 'warning',
      code: 'history-missing',
      message: `Sin datos de ${missingYears.join(' y ')}, ningún donante puede salir como recurrente.`,
      action: 'Añade los ficheros 182 presentados esos años (o una hoja con sus donativos) para calcular la recurrencia. Si no los añades, los donantes recurrentes perderán 5 puntos de deducción.',
    });
  }

  results.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  records.sort((a, b) => a.name.localeCompare(b.name, 'es') || a.key.localeCompare(b.key));
  const severityRank: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const included = results.filter((d) => d.included);
  return {
    year,
    donors: results,
    records,
    issues,
    historyYears: [...historyYears].sort(),
    stats: {
      rowsRead: input.rows.length,
      rowsUsed,
      donorsIncluded: included.length,
      donorsExcluded: results.length - included.length + invalidNif.size,
      recurrentDonors: included.filter((d) => d.verdict.recurrent).length,
      totalDeclaredCents: records.reduce((s, r) => s + r.amountCents, 0),
      totalExcludedCents,
    },
  };
}
