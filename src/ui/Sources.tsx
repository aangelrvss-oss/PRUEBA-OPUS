import { useId, useRef, useState } from 'react';
import type { TableFile } from '../core/files';
import { FIELD_LABELS, mappingProblems, type ColumnMapping, type FieldKey } from '../core/mapping';
import { hasDateColumn, nameOrderGuess, type Source, type SourceSummary } from '../core/workflow';
import { IconTrash, IconUpload } from './icons';

/* ------------------------------------------------------------------ */
/* Drop zone                                                           */
/* ------------------------------------------------------------------ */

export function DropZone({ onFiles, compact, busy }: { onFiles: (files: File[]) => void; compact: boolean; busy: boolean }) {
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const depth = useRef(0);
  return (
    <div
      className={`dropzone${compact ? ' compact' : ''}${dragging ? ' dragging' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        const files = [...e.dataTransfer.files];
        if (files.length) onFiles(files);
      }}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : <IconUpload className="big" />}
      <div>
        <label htmlFor={inputId} style={{ fontWeight: 600, cursor: 'pointer' }}>
          {compact ? 'Añadir más archivos' : 'Arrastra aquí tus archivos o haz clic para elegirlos'}
        </label>
        {!compact && (
          <p className="muted" style={{ marginTop: 6, maxWidth: '56ch' }}>
            La hoja de donativos del año y, para calcular la recurrencia, los ficheros 182 presentados los dos años
            anteriores (o una hoja con esos donativos).
          </p>
        )}
        <p className="formats" style={{ marginTop: compact ? 2 : 10 }}>.csv · .xlsx · .txt (modelo 182) · máx. 15 MB</p>
      </div>
      <input
        id={inputId}
        type="file"
        multiple
        accept=".csv,.xlsx,.txt,.tsv,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        data-testid="file-input"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* File cards                                                          */
/* ------------------------------------------------------------------ */

const FIELD_ORDER: FieldKey[] = ['nif', 'fullName', 'lastName', 'firstName', 'amount', 'date', 'year', 'postcode', 'province', 'key', 'inKind', 'representativeNif'];

function describeYears(sum: SourceSummary, unit: string): string {
  const parts = Object.entries(sum.byYear)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([y, n]) => `${y}: ${n.toLocaleString('es')} ${unit}`);
  if (sum.rowsWithoutYear) parts.push(`sin fecha: ${sum.rowsWithoutYear.toLocaleString('es')} ${unit}`);
  return parts.join(' · ');
}

export function SourceCard(props: {
  source: Source;
  summary: SourceSummary;
  year: number;
  entityNif: string;
  onChange: (s: Source) => void;
  onRemove: () => void;
}) {
  const { source, summary, year, entityNif } = props;
  const [open, setOpen] = useState(false);
  const isTable = source.file.kind === 'table';
  const problems = summary.problems;
  const showMapping = isTable && (open || problems.length > 0);

  let role: string;
  let roleWarn: string | null = null;
  if (source.file.kind === 'model182') {
    const p = source.file.parsed;
    role = p.year ? `Modelo 182 del ejercicio ${p.year} · ${p.entries.length.toLocaleString('es')} donantes` : 'Modelo 182 sin registros';
    if (p.year !== null && p.year >= year) roleWarn = `No se usa: el historial debe ser de años anteriores a ${year}.`;
    else if (p.year !== null && p.year < year - 2) roleWarn = `No se usa: para ${year} solo cuentan ${year - 1} y ${year - 2}.`;
    if (entityNif && p.declarantNif && p.declarantNif !== entityNif) {
      roleWarn = `Este fichero es de otro declarante (${p.declarantNif}). Comprueba que es de tu entidad.`;
    }
  } else {
    role = problems.length ? 'Hoja de cálculo · faltan columnas' : describeYears(summary, 'filas') || 'Sin filas';
  }

  return (
    <div className="filecard fade-in" data-testid="filecard">
      <span className={`icon${source.file.kind === 'model182' ? ' is182' : ''}`} aria-hidden="true">
        {source.file.kind === 'model182' ? '182' : source.file.name.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'CSV'}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="name">{source.file.name}</div>
        <div className="meta">
          <span>{role}</span>
          {isTable && problems.length === 0 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 24, padding: '0 6px' }} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              {open ? 'Ocultar columnas' : 'Revisar columnas'}
            </button>
          )}
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={props.onRemove} aria-label={`Quitar ${source.file.name}`}>
        <IconTrash /> <span className="visually-hidden">Quitar</span>
      </button>

      {(roleWarn || summary.warnings.length > 0 || problems.length > 0 || (isTable && !hasDateColumn(source)) || (isTable && nameOrderGuess(source.file, source.mapping) !== null)) && (
        <div className="extra">
          {roleWarn && <p className="badge badge-warn" style={{ whiteSpace: 'normal' }}>{roleWarn}</p>}
          {problems.map((p) => (
            <p key={p.field} className="badge badge-error" style={{ whiteSpace: 'normal' }}>{p.message} Elige la columna abajo.</p>
          ))}
          {isTable && problems.length === 0 && !hasDateColumn(source) && (
            <FixedYear source={source} year={year} onChange={props.onChange} />
          )}
          {isTable && problems.length === 0 && <NameOrder source={source} onChange={props.onChange} />}
          {summary.warnings.map((w) => (
            <p key={w} className="small subtle">{w}</p>
          ))}
        </div>
      )}
      {showMapping && (
        <div className="extra">
          <MappingEditor
            file={source.file as TableFile}
            mapping={source.mapping}
            onChange={(mapping) => props.onChange({ ...source, mapping, givenFirst: nameOrderGuess(source.file, mapping)?.givenFirst ?? false })}
          />
        </div>
      )}
    </div>
  );
}

function NameOrder({ source, onChange }: { source: Source; onChange: (s: Source) => void }) {
  const guess = nameOrderGuess(source.file, source.mapping);
  const id = useId();
  if (!guess || guess.checked === 0) return null;
  return (
    <div className="small" style={{ display: 'grid', gap: 4 }}>
      <label htmlFor={id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input id={id} type="checkbox" checked={source.givenFirst} onChange={(e) => onChange({ ...source, givenFirst: e.target.checked })} style={{ marginTop: 4 }} />
        <span>
          Los nombres están escritos como «Nombre Apellidos»: reordenarlos a «Apellidos Nombre», como pide la AEAT
          {guess.example && source.givenFirst ? <span className="subtle"> (p. ej. «{guess.example.before}» → «{guess.example.after}»)</span> : null}.
        </span>
      </label>
      {guess.givenFirst && (
        <span className="subtle">
          Detectado automáticamente: el {Math.round(guess.firstIsGiven * 100)} % de los nombres empieza por un nombre de pila frecuente.
        </span>
      )}
    </div>
  );
}

function FixedYear({ source, year, onChange }: { source: Source; year: number; onChange: (s: Source) => void }) {
  const id = useId();
  const value = source.fixedYear ?? year;
  return (
    <div className="field" style={{ maxWidth: 420 }}>
      <label htmlFor={id}>Esta hoja no tiene fecha. ¿De qué año son estos donativos?</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange({ ...source, fixedYear: Number(e.target.value) })}>
        {[year, year - 1, year - 2].map((y) => (
          <option key={y} value={y}>
            {y}
            {y === year ? ' (ejercicio que declaras)' : ' (historial)'}
          </option>
        ))}
      </select>
    </div>
  );
}

function MappingEditor({ file, mapping, onChange }: { file: TableFile; mapping: ColumnMapping; onChange: (m: ColumnMapping) => void }) {
  const problems = new Set(mappingProblems(mapping).map((p) => p.field));
  const mappedBy = new Map<number, FieldKey>();
  for (const [k, v] of Object.entries(mapping)) if (v !== undefined) mappedBy.set(v, k as FieldKey);
  const preview = file.rows.slice(0, 5);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="mapping">
        {FIELD_ORDER.map((field) => {
          const needed = (field === 'nif' && problems.has('nif')) || (field === 'amount' && problems.has('amount')) || ((field === 'fullName' || field === 'lastName') && problems.has('name'));
          return (
            <div className="field" key={field}>
              <label htmlFor={`map-${file.name}-${field}`}>
                {FIELD_LABELS[field]}
                {['nif', 'amount'].includes(field) && <span className="subtle"> · obligatorio</span>}
              </label>
              <select
                id={`map-${file.name}-${field}`}
                className="select"
                aria-invalid={needed || undefined}
                value={mapping[field] ?? ''}
                onChange={(e) => {
                  const next = { ...mapping };
                  if (e.target.value === '') delete next[field];
                  else {
                    const idx = Number(e.target.value);
                    for (const k of Object.keys(next) as FieldKey[]) if (next[k] === idx) delete next[k];
                    next[field] = idx;
                  }
                  onChange(next);
                }}
              >
                <option value="">— No usar —</option>
                {file.headers.map((h, i) => (
                  <option key={i} value={i}>{h}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <div className="preview-wrap" role="region" aria-label="Primeras filas del archivo" tabIndex={0}>
        <table className="preview">
          <thead>
            <tr>
              {file.headers.map((h, i) => (
                <th key={i} className={mappedBy.has(i) ? 'mapped' : ''}>
                  {h}
                  <span className="tag">{mappedBy.has(i) ? `→ ${FIELD_LABELS[mappedBy.get(i) as FieldKey]}` : 'sin usar'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i}>
                {file.headers.map((_, j) => {
                  const v = r[j];
                  return <td key={j}>{v instanceof Date ? v.toLocaleDateString('es') : v === null || v === undefined ? '' : String(v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
