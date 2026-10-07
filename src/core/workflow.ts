import { buildDeclaration, extractRows, type Declaration, type DonationRow, type HistoryEntry } from './engine';
import type { LoadedFile, TableFile } from './files';
import { detectMapping, mappingProblems, type ColumnMapping, type MappingProblem } from './mapping';
import { RULESET } from './rules';

/** A file the user dropped, plus the choices made about it. */
export interface Source {
  id: string;
  file: LoadedFile;
  /** Column mapping for spreadsheets. */
  mapping: ColumnMapping;
  /** Year applied to rows that have no date/year (spreadsheets only). */
  fixedYear: number | null;
}

export function makeSource(id: string, file: LoadedFile): Source {
  return {
    id,
    file,
    mapping: file.kind === 'table' ? detectMapping(file.headers) : {},
    fixedYear: null,
  };
}

export function hasDateColumn(s: Source): boolean {
  return s.mapping.date !== undefined || s.mapping.year !== undefined;
}

export interface SourceSummary {
  id: string;
  name: string;
  kind: LoadedFile['kind'];
  problems: MappingProblem[];
  /** Rows (tables) or donors (182 files) by year. */
  byYear: Record<number, number>;
  rowsWithoutYear: number;
  warnings: string[];
}

function tableRows(s: Source & { file: TableFile }): DonationRow[] {
  const rows = extractRows(s.file.rows, s.mapping, s.file.name);
  if (s.fixedYear !== null) for (const r of rows) if (r.year === null) r.year = s.fixedYear;
  return rows;
}

export function summarizeSource(s: Source): SourceSummary {
  const byYear: Record<number, number> = {};
  const warnings: string[] = [];
  let rowsWithoutYear = 0;
  if (s.file.kind === 'model182') {
    const p = s.file.parsed;
    if (p.year !== null) byYear[p.year] = p.entries.length;
    warnings.push(...p.warnings.slice(0, 5));
    return { id: s.id, name: s.file.name, kind: 'model182', problems: [], byYear, rowsWithoutYear, warnings };
  }
  const problems = mappingProblems(s.mapping);
  if (problems.length === 0) {
    for (const r of tableRows(s as Source & { file: TableFile })) {
      if (r.year === null) rowsWithoutYear++;
      else byYear[r.year] = (byYear[r.year] ?? 0) + 1;
    }
  }
  if (s.file.note) warnings.push(s.file.note);
  return { id: s.id, name: s.file.name, kind: 'table', problems, byYear, rowsWithoutYear, warnings };
}

/** Most frequent year among spreadsheet rows; else the year after the latest 182 file. */
export function guessYear(sources: Source[], today = new Date()): number {
  const counts = new Map<number, number>();
  let latest182 = 0;
  for (const s of sources) {
    const sum = summarizeSource(s);
    if (s.file.kind === 'model182') {
      for (const y of Object.keys(sum.byYear)) latest182 = Math.max(latest182, Number(y));
    } else {
      for (const [y, n] of Object.entries(sum.byYear)) counts.set(Number(y), (counts.get(Number(y)) ?? 0) + n);
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  const fallback = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  const year = best?.[0] ?? (latest182 ? latest182 + 1 : fallback);
  return Math.max(year, RULESET.validFromYear);
}

export interface WorkflowResult {
  declaration: Declaration;
  summaries: SourceSummary[];
  blocked: boolean;
  declarantNifsInHistory: string[];
}

export function runWorkflow(sources: Source[], year: number): WorkflowResult {
  const summaries = sources.map(summarizeSource);
  const blocked = summaries.some((s) => s.problems.length > 0);
  const rows: DonationRow[] = [];
  const history: HistoryEntry[] = [];
  const declarantNifs = new Set<string>();

  for (const s of sources) {
    if (s.file.kind === 'model182') {
      const p = s.file.parsed;
      if (p.declarantNif) declarantNifs.add(p.declarantNif);
      if (p.year !== null && p.year < year) history.push(...p.entries);
      continue;
    }
    if (mappingProblems(s.mapping).length > 0) continue;
    rows.push(...tableRows(s as Source & { file: TableFile }));
  }

  return {
    declaration: buildDeclaration({ year, rows, history }),
    summaries,
    blocked,
    declarantNifsInHistory: [...declarantNifs],
  };
}
