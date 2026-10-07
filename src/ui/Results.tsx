import { Fragment, useMemo, useState } from 'react';
import { DECLARED_FIELDS, declaredRecord } from '../core/boe182';
import type { Declaration, DonorResult, Issue, Record182 } from '../core/engine';
import { PROVINCES } from '../core/provinces';
import { formatEuros } from '../core/values';
import { IconAlert, IconCheck, IconChevron, IconError, IconInfo, IconSearch } from './icons';

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export function Stats({ d }: { d: Declaration }) {
  const errors = d.issues.filter((i) => i.severity === 'error').length;
  return (
    <div className="stats" data-testid="stats">
      <div className="stat good">
        <span className="value">{d.stats.donorsIncluded.toLocaleString('es')}</span>
        <span className="label">donantes en el fichero ({d.records.length.toLocaleString('es')} registros)</span>
      </div>
      <div className="stat">
        <span className="value">{formatEuros(d.stats.totalDeclaredCents)}</span>
        <span className="label">importe declarado</span>
      </div>
      <div className="stat">
        <span className="value">{d.stats.recurrentDonors.toLocaleString('es')}</span>
        <span className="label">donantes recurrentes</span>
      </div>
      <div className={`stat${errors ? ' attention' : ''}`}>
        <span className="value">{errors.toLocaleString('es')}</span>
        <span className="label">
          {errors ? `problemas por corregir · ${formatEuros(d.stats.totalExcludedCents)} fuera del fichero` : 'problemas por corregir'}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Issues                                                              */
/* ------------------------------------------------------------------ */

const SEV_ICON = { error: IconError, warning: IconAlert, info: IconInfo } as const;
const SEV_LABEL = { error: 'Error', warning: 'Aviso', info: 'Nota' } as const;

function where(i: Issue): string {
  const parts: string[] = [];
  if (i.nif) parts.push(`NIF ${i.nif}`);
  if (i.rows?.length) {
    const bySource = new Map<string, number[]>();
    for (const r of i.rows) bySource.set(r.source, [...(bySource.get(r.source) ?? []), r.row]);
    for (const [src, rows] of bySource) {
      const shown = rows.slice(0, 8).join(', ');
      parts.push(`${src} · fila${rows.length > 1 ? 's' : ''} ${shown}${rows.length > 8 ? ` y ${rows.length - 8} más` : ''}`);
    }
  }
  if (i.amountCents !== undefined) parts.push(formatEuros(i.amountCents));
  return parts.join(' · ');
}

export function Issues({ issues }: { issues: Issue[] }) {
  const [showAll, setShowAll] = useState(false);
  if (issues.length === 0) {
    return (
      <div className="alert alert-ok" data-testid="no-issues">
        <IconCheck />
        <span className="alert-title">Sin problemas detectados</span>
        <span className="alert-body">Todos los donativos tienen NIF válido, provincia e importe. Revisa la tabla y descarga el fichero.</span>
      </div>
    );
  }
  const visible = showAll ? issues : issues.slice(0, 6);
  return (
    <div className="issues" data-testid="issues">
      {visible.map((i, k) => {
        const Icon = SEV_ICON[i.severity];
        return (
          <div key={`${i.code}-${k}`} className={`issue ${i.severity}`}>
            <span className={`sev badge badge-${i.severity === 'warning' ? 'warn' : i.severity}`} title={SEV_LABEL[i.severity]}>
              <Icon width={14} height={14} />
              <span className="visually-hidden">{SEV_LABEL[i.severity]}</span>
            </span>
            <span className="msg">
              {i.name && i.code.startsWith('nif') ? <>{i.name}: </> : null}
              {i.message}
            </span>
            <span className="act">{i.action}</span>
            {where(i) && <span className="where">{where(i)}</span>}
          </div>
        );
      })}
      {issues.length > 6 && (
        <button type="button" className="btn btn-secondary btn-sm" style={{ justifySelf: 'start' }} onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Ver menos' : `Ver los ${issues.length} avisos`}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donor table                                                         */
/* ------------------------------------------------------------------ */

type Filter = 'all' | 'recurrent' | 'notRecurrent' | 'excluded' | 'notes';
const FILTERS: { id: Filter; label: string; test: (d: DonorResult) => boolean }[] = [
  { id: 'all', label: 'Todos', test: () => true },
  { id: 'recurrent', label: 'Recurrentes', test: (d) => d.included && d.verdict.recurrent },
  { id: 'notRecurrent', label: 'No recurrentes', test: (d) => d.included && !d.verdict.recurrent },
  { id: 'excluded', label: 'Fuera del fichero', test: (d) => !d.included },
  { id: 'notes', label: 'Con notas', test: (d) => d.notes.length > 0 },
];
const PAGE = 50;

function YearBars({ d, year }: { d: DonorResult; year: number }) {
  const vals = [year - 2, year - 1, year].map((y) => d.totals[y] ?? 0);
  const max = Math.max(...vals, 1);
  return (
    <div className="years" aria-hidden="true">
      {vals.map((v, i) => (
        <span
          key={i}
          className={`bar${i === 2 ? ' cur' : ''}${i > 0 && v < (vals[i - 1] ?? 0) && v > 0 ? ' down' : ''}`}
          style={{ height: `${Math.max(2, Math.round((v / max) * 34))}px` }}
        />
      ))}
    </div>
  );
}

export function DonorTable({ d, declarantNif }: { d: Declaration; declarantNif: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const y = d.year;

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, d.donors.filter(f.test).length])), [d]);
  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0]!;
    const q = query.trim().toLowerCase();
    return d.donors.filter((x) => f.test(x) && (!q || x.name.toLowerCase().includes(q) || x.nif.toLowerCase().includes(q)));
  }, [d, filter, query]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <div>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filtrar donantes">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setPage(0); }}>
              {f.label}<span className="count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="visually-hidden" htmlFor="donor-search">Buscar donante</label>
        <div style={{ position: 'relative', marginLeft: 'auto', flex: '1 1 220px', maxWidth: 300 }}>
          <IconSearch style={{ position: 'absolute', left: 10, top: 12, width: 18, height: 18, color: 'var(--ink-3)' }} />
          <input id="donor-search" className="input" style={{ paddingLeft: 34 }} placeholder="Buscar por nombre o NIF" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
        </div>
      </div>

      <div className="table-wrap">
        <table className="dtable" data-testid="donor-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><span className="visually-hidden">Detalle</span></th>
              <th>Donante</th>
              <th className="r hide-sm">{y - 2}</th>
              <th className="r hide-sm">{y - 1}</th>
              <th className="r">{y}</th>
              <th className="hide-sm"><span className="visually-hidden">Evolución</span></th>
              <th>Recurrencia</th>
              <th className="r">% deducción</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr><td colSpan={8} className="empty">Ningún donante coincide con el filtro.</td></tr>
            )}
            {slice.map((x) => {
              const isOpen = open === x.nif;
              return (
                <Fragment key={x.nif}>
                  <tr className={`donor${x.included ? '' : ' excluded'}`}>
                    <td>
                      <button type="button" className="expander" aria-expanded={isOpen} aria-controls={`detail-${x.nif}`} onClick={() => setOpen(isOpen ? null : x.nif)}>
                        <IconChevron />
                        <span className="visually-hidden">Ver detalle de {x.name}</span>
                      </button>
                    </td>
                    <td>
                      <div className="name">{x.name || '(sin nombre)'}</div>
                      <div className="nif">{x.nif} · {x.province ? PROVINCES[x.province] : 'sin provincia'}{x.nature !== 'F' ? ` · ${x.nature === 'J' ? 'persona jurídica' : 'entidad (E)'}` : ''}</div>
                    </td>
                    <td className="r num hide-sm">{fmt(x.totals[y - 2])}</td>
                    <td className="r num hide-sm">{fmt(x.totals[y - 1])}</td>
                    <td className="r num">{fmt(x.totals[y])}</td>
                    <td className="hide-sm"><YearBars d={x} year={y} /></td>
                    <td>
                      {!x.included ? (
                        <span className="badge badge-error">Fuera del fichero</span>
                      ) : x.verdict.recurrent ? (
                        <span className="badge badge-ok"><IconCheck width={13} height={13} /> Recurrente</span>
                      ) : (
                        <span className={`badge ${'missingHistory' in x.verdict && x.verdict.missingHistory ? 'badge-warn' : 'badge-no'}`}>No recurrente</span>
                      )}
                      <div className="reason">{x.included ? x.verdict.reason : x.blockedBy}</div>
                    </td>
                    <td className="r num">{x.records.map((r) => `${r.percent} %`).join(' · ') || '—'}</td>
                  </tr>
                  {isOpen && (
                    <tr className="detail" id={`detail-${x.nif}`}>
                      <td />
                      <td colSpan={7}>
                        <DonorDetail x={x} year={y} declarantNif={declarantNif} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="pagination">
            <span>
              {current * PAGE + 1}–{Math.min(rows.length, (current + 1) * PAGE)} de {rows.length.toLocaleString('es')}
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Siguiente</button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(cents: number | undefined): string {
  return cents ? formatEuros(cents) : '—';
}

function DonorDetail({ x, year, declarantNif }: { x: DonorResult; year: number; declarantNif: string }) {
  return (
    <div style={{ display: 'grid', gap: 14, padding: '6px 0' }}>
      <div>
        <h4 style={{ fontSize: '.95rem', marginBottom: 6 }}>Por qué</h4>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', display: 'grid', gap: 4 }}>
          <li>
            Donó {fmt(x.totals[year - 2])} en {year - 2}, {fmt(x.totals[year - 1])} en {year - 1} y {fmt(x.totals[year])} en {year} ({x.rowCount} {x.rowCount === 1 ? 'fila' : 'filas'} este año).
          </li>
          <li>{x.verdict.recurrent ? 'Es recurrente: ' : 'No es recurrente: '}{x.verdict.reason}</li>
          {x.records.map((r, i) => (
            <li key={i}>
              Clave {r.key}{r.inKind ? ', en especie' : ''}: {formatEuros(r.amountCents)} al {r.percent} %. {percentWhy(r)}
            </li>
          ))}
          {x.notes.map((n) => <li key={n}>{n}</li>)}
          {!x.included && <li><strong>No va en el fichero:</strong> {x.blockedBy}</li>}
        </ul>
      </div>
      {x.records.map((r, i) => (
        <RecordInspector key={i} record={r} year={year} declarantNif={declarantNif} />
      ))}
    </div>
  );
}

function percentWhy(r: Record182): string {
  if (r.nature === 'J') return `Persona jurídica: ${r.recurrent ? 'porcentaje incrementado por recurrencia' : 'porcentaje general'}.`;
  if (r.amountCents <= 25000) return 'No supera 250 €: se declara el porcentaje de micromecenazgo.';
  return `Supera 250 €: se declara el porcentaje del exceso${r.recurrent ? ', incrementado por recurrencia' : ''}. La AEAT aplica el ${r.key === 'B' ? '85' : '80'} % a los primeros 250 € del donante.`;
}

export function RecordInspector({ record, year, declarantNif }: { record: Record182; year: number; declarantNif: string }) {
  const [hl, setHl] = useState<number | null>(null);
  const line = declaredRecord(year, declarantNif || '000000000', record);
  return (
    <div className="inspector">
      <h4 style={{ fontSize: '.95rem' }}>
        Registro tal y como irá en el fichero <span className="subtle small">(250 posiciones; pasa el ratón por un campo)</span>
      </h4>
      <div className="record" aria-label="Registro de tipo 2">
        {DECLARED_FIELDS.map((f, i) => (
          <span key={f.from} className={hl === i ? 'hl' : ''} title={`${f.from}–${f.to} · ${f.label}`} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}>
            {line.slice(f.from - 1, f.to).replace(/ /g, '·')}
          </span>
        ))}
      </div>
      <div className="fieldlist">
        {DECLARED_FIELDS.filter((f) => f.from < 133).map((f) => {
          const i = DECLARED_FIELDS.indexOf(f);
          return (
            <div key={f.from} className={hl === i ? 'hl' : ''} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}>
              <span className="pos">{f.from === f.to ? f.from : `${f.from}–${f.to}`}</span>
              <span>{f.label}: <span className="val">{line.slice(f.from - 1, f.to).trim() || '(blancos)'}</span></span>
            </div>
          );
        })}
      </div>
      {!declarantNif && <p className="small subtle">El NIF de la entidad (posiciones 9–17) aparecerá cuando lo rellenes abajo.</p>}
    </div>
  );
}
