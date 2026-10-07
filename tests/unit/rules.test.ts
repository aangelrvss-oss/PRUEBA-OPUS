import { describe, expect, it } from 'vitest';
import { deductionPercent, recurrence } from '../../src/core/rules';

const both = new Set([2023, 2024]);

describe('recurrence (ejercicio 2025 wording)', () => {
  it('is recurrent when 2023 ≤ 2024 ≤ 2025 and both previous years have donations', () => {
    expect(recurrence(2025, { 2023: 10000, 2024: 10000, 2025: 10000 }, both).recurrent).toBe(true);
    expect(recurrence(2025, { 2023: 5000, 2024: 10000, 2025: 12000 }, both).recurrent).toBe(true);
  });

  it('is NOT recurrent if the current year is lower than the previous one (new 2025 condition)', () => {
    const v = recurrence(2025, { 2023: 10000, 2024: 10000, 2025: 9000 }, both);
    expect(v.recurrent).toBe(false);
    expect(v.reason).toContain('En 2025 donó menos que en 2024');
  });

  it('is NOT recurrent if the previous year dropped', () => {
    const v = recurrence(2025, { 2023: 12000, 2024: 10000, 2025: 15000 }, both);
    expect(v.recurrent).toBe(false);
    expect(v.reason).toContain('En 2024 donó menos que en 2023');
  });

  it('is NOT recurrent if a previous year is missing for that donor', () => {
    const v = recurrence(2025, { 2024: 10000, 2025: 10000 }, both);
    expect(v.recurrent).toBe(false);
    expect(v.reason).toContain('No donó en 2023');
    expect('missingHistory' in v && v.missingHistory).toBeFalsy();
  });

  it('flags missing history instead of blaming the donor', () => {
    const v = recurrence(2025, { 2024: 10000, 2025: 10000 }, new Set([2024]));
    expect(v.recurrent).toBe(false);
    expect('missingHistory' in v && v.missingHistory).toBe(true);
    expect(v.reason).toContain('No hay datos de 2023');
  });

  it('compares totals in cents exactly (no float drift)', () => {
    expect(recurrence(2026, { 2024: 3333, 2025: 3333, 2026: 3333 }, new Set([2024, 2025])).recurrent).toBe(true);
    expect(recurrence(2026, { 2024: 3334, 2025: 3333, 2026: 9999 }, new Set([2024, 2025])).recurrent).toBe(false);
  });
});

describe('deduction percentage (field 79-83)', () => {
  it('individuals, key A: 80 up to 250 €, then 40 or 45 if recurrent', () => {
    expect(deductionPercent('F', 'A', 25000, false)).toBe(80);
    expect(deductionPercent('F', 'A', 25000, true)).toBe(80);
    expect(deductionPercent('F', 'A', 25001, false)).toBe(40);
    expect(deductionPercent('F', 'A', 30000, true)).toBe(45);
  });

  it('individuals, key B (priority activities): five points more', () => {
    expect(deductionPercent('F', 'B', 10000, false)).toBe(85);
    expect(deductionPercent('F', 'B', 50000, false)).toBe(45);
    expect(deductionPercent('F', 'B', 50000, true)).toBe(50);
  });

  it('companies: no micro-patronage threshold; 40/50 and 45/55', () => {
    expect(deductionPercent('J', 'A', 10000, false)).toBe(40);
    expect(deductionPercent('J', 'A', 10000, true)).toBe(50);
    expect(deductionPercent('J', 'B', 10000, false)).toBe(45);
    expect(deductionPercent('J', 'B', 10000, true)).toBe(55);
  });

  it('income-attribution entities use the individual percentages', () => {
    expect(deductionPercent('E', 'A', 10000, false)).toBe(80);
  });
});
