import type { DonorNature } from './nif';

/**
 * Deduction rules for entities covered by Title III of Ley 49/2002
 * (Modelo 182 "NATURALEZA DEL DECLARANTE" = 1), as in force for ejercicios 2025+.
 *
 * Sources (see VALIDATION.md for confidence):
 * - Real Decreto-ley 6/2023: 80 % on the first 250 €, 40 % on the rest, 45 % if
 *   recurrent (IRPF); 40 % / 50 % for Corporate Tax; +5 points for priority
 *   activities of patronage (key B).
 * - AEAT Manual Renta 2025: recurrence in 2025 requires donations to the same
 *   entity in 2023 and 2024, and the amounts of 2025 and 2024 to be equal to or
 *   higher than the previous year's.
 * - AEAT register design, field 79-83: for IRPF taxpayers declare the percentage
 *   of the part of the base above the micro-patronage threshold; if the base does
 *   not exceed it, the micro-patronage percentage.
 */
export const RULESET = {
  id: 'ley49-2002-ejercicio-2025',
  label: 'Ley 49/2002 tras el RDL 6/2023 · recurrencia según la redacción aplicable desde el ejercicio 2025',
  validFromYear: 2025,
  microThresholdCents: 25000,
  individual: { A: { micro: 80, rest: 40, recurrent: 45 }, B: { micro: 85, rest: 45, recurrent: 50 } },
  company: { A: { rest: 40, recurrent: 50 }, B: { rest: 45, recurrent: 55 } },
} as const;

export type DonationKey = 'A' | 'B';

export interface YearTotals {
  /** Total deductible donations by year, in cents (all keys, cash and in kind). */
  [year: number]: number | undefined;
}

export type RecurrenceVerdict =
  | { recurrent: true; reason: string }
  | { recurrent: false; reason: string; missingHistory?: boolean };

/**
 * Recurrence for ejercicio `year`: the donor gave to this entity in both
 * previous years, and amount(year-1) >= amount(year-2) and amount(year) >= amount(year-1).
 */
export function recurrence(
  year: number,
  totals: YearTotals,
  historyYears: ReadonlySet<number>,
): RecurrenceVerdict {
  const y0 = totals[year] ?? 0;
  const y1 = totals[year - 1] ?? 0;
  const y2 = totals[year - 2] ?? 0;
  const missing = [year - 1, year - 2].filter((y) => !historyYears.has(y));

  if (y1 <= 0 || y2 <= 0) {
    const absent = [y2 <= 0 ? year - 2 : null, y1 <= 0 ? year - 1 : null].filter((v) => v !== null);
    if (missing.length > 0 && absent.some((y) => missing.includes(y as number))) {
      return {
        recurrent: false,
        missingHistory: true,
        reason: `No hay datos de ${missing.join(' ni de ')}: se declara como no recurrente.`,
      };
    }
    return { recurrent: false, reason: `No donó en ${absent.join(' ni en ')}.` };
  }
  if (y1 < y2) return { recurrent: false, reason: `En ${year - 1} donó menos que en ${year - 2}.` };
  if (y0 < y1) return { recurrent: false, reason: `En ${year} donó menos que en ${year - 1}.` };
  return { recurrent: true, reason: `Donó en ${year - 2} y ${year - 1}, y ningún año bajó respecto al anterior.` };
}

/** Percentage to declare in field 79-83 for one record. */
export function deductionPercent(
  nature: DonorNature,
  key: DonationKey,
  amountCents: number,
  recurrent: boolean,
): number {
  if (nature === 'J') {
    const r = RULESET.company[key];
    return recurrent ? r.recurrent : r.rest;
  }
  // Individuals (F) and entities under income attribution (E), whose members
  // apply the deduction in their personal income tax.
  const r = RULESET.individual[key];
  if (amountCents <= RULESET.microThresholdCents) return r.micro;
  return recurrent ? r.recurrent : r.rest;
}
