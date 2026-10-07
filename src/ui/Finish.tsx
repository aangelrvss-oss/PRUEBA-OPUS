import { useState } from 'react';
import { track } from '../analytics';
import { build182, entityProblems, type EntityInfo } from '../core/boe182';
import type { Declaration } from '../core/engine';
import { donorReportCsv, historyCsv } from '../core/exports';
import { saveFile } from './download';
import { IconAlert, IconCheck, IconDownload } from './icons';

export function EntityForm({ entity, onChange, showErrors }: { entity: EntityInfo; onChange: (e: EntityInfo) => void; showErrors: boolean }) {
  const problems = entityProblems(entity);
  const err = (f: keyof EntityInfo) => (showErrors ? problems.find((p) => p.field === f)?.message : undefined);
  const set = (k: keyof EntityInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...entity, [k]: e.target.value });
  const field = (k: keyof EntityInfo, label: string, hint: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label htmlFor={`entity-${k}`}>{label}</label>
      <input
        id={`entity-${k}`}
        className={`input${['nif', 'phone', 'receiptNumber', 'previousReceiptNumber'].includes(k) ? ' mono' : ''}`}
        value={(entity[k] as string) ?? ''}
        onChange={set(k)}
        aria-invalid={err(k) ? true : undefined}
        aria-describedby={`entity-${k}-hint`}
        {...props}
      />
      <span id={`entity-${k}-hint`} className={err(k) ? 'error-text' : 'hint'}>{err(k) ?? hint}</span>
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="form-grid">
        {field('nif', 'NIF de la entidad', 'El de la fundación o asociación, p. ej. G12345674.', { autoComplete: 'off', spellCheck: false, placeholder: 'G12345674' })}
        {field('name', 'Denominación completa', 'Tal como figura en el censo, sin siglas ni nombre comercial.', { placeholder: 'Fundación Ejemplo' })}
        {field('phone', 'Teléfono de contacto', '9 dígitos.', { inputMode: 'numeric', autoComplete: 'tel-national', placeholder: '912345678' })}
        {field('contactName', 'Persona de contacto', 'Primer apellido, segundo apellido y nombre, en ese orden.', { autoComplete: 'name', placeholder: 'García López Ana' })}
      </div>
      <details>
        <summary className="small" style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>Complementaria, sustitutiva o número de justificante</summary>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="entity-replacement">Tipo de declaración</label>
            <select id="entity-replacement" className="select" value={entity.replacement ?? ''} onChange={set('replacement')}>
              <option value="">Normal (primera presentación)</option>
              <option value="C">Complementaria (añade donantes omitidos)</option>
              <option value="S">Sustitutiva (reemplaza la anterior)</option>
            </select>
          </div>
          {entity.replacement
            ? field('previousReceiptNumber', 'Justificante de la declaración anterior', '13 dígitos.', { inputMode: 'numeric' })
            : field('receiptNumber', 'Número de justificante (opcional)', 'Si lo dejas vacío, el formulario de la AEAT asigna el suyo al presentar.', { inputMode: 'numeric', placeholder: '182…' })}
        </div>
      </details>
      <p className="small subtle">Estos datos se guardan solo en este navegador para la próxima vez.</p>
    </div>
  );
}

export function DownloadPanel({ d, entity, onNeedEntity }: { d: Declaration; entity: EntityInfo; onNeedEntity: () => void }) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const problems = entityProblems(entity);
  const errors = d.issues.filter((i) => i.severity === 'error');
  const noRecords = d.records.length === 0;

  const download182 = () => {
    setError(null);
    if (problems.length) {
      onNeedEntity();
      return;
    }
    try {
      const built = build182(d, entity);
      saveFile(built.bytes, built.fileName, 'text/plain;charset=iso-8859-1');
      setDone(built.fileName);
      track('file_downloaded', { records: d.records.length > 0 ? 'some' : 'none', errorsLeft: errors.length > 0 });
    } catch (e) {
      setError(`No se pudo generar el fichero: ${(e as Error).message}`);
    }
  };

  return (
    <div className="download" data-testid="download">
      <div style={{ display: 'grid', gap: 14 }}>
        {errors.length > 0 && (
          <div className="alert alert-warn">
            <IconAlert />
            <span className="alert-title">{errors.length} problema(s) dejan donativos fuera del fichero</span>
            <span className="alert-body">
              Lo mejor es corregirlos en tu hoja y volver a cargarla. Si no llegas, puedes presentar ahora y añadir esos donantes
              después con una declaración complementaria.
            </span>
          </div>
        )}
        {problems.length > 0 && (
          <p className="small muted">Para descargar el fichero, completa los datos de la entidad.</p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={download182} disabled={noRecords} data-testid="download-182">
            <IconDownload /> Descargar fichero 182
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              saveFile(donorReportCsv(d), `revision_182_${d.year}.csv`, 'text/csv;charset=utf-8');
              track('report_downloaded');
            }}
          >
            Informe de revisión (CSV)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              saveFile(historyCsv(d), `historial_donativos_${d.year - 1}_${d.year}.csv`, 'text/csv;charset=utf-8');
              track('history_downloaded');
            }}
          >
            Historial para el año que viene
          </button>
        </div>
        {noRecords && <p className="small error-text" style={{ color: 'var(--error)' }}>No hay ningún donante válido que declarar todavía.</p>}
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {done && (
          <div className="alert alert-ok fade-in" role="status" data-testid="download-done">
            <IconCheck />
            <span className="alert-title">Fichero descargado: {done}</span>
            <span className="alert-body">Ahora impórtalo en la Sede de la AEAT siguiendo los pasos. Guarda también el historial.</span>
          </div>
        )}
      </div>
      <div>
        <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>Cómo presentarlo</h3>
        <ol className="howto">
          <li>Entra en la Sede electrónica de la AEAT › Modelo 182 › «Presentación mediante formulario».</li>
          <li>Identifícate con certificado, DNIe o Cl@ve e indica el NIF de la entidad y el ejercicio {d.year}.</li>
          <li>Pulsa «Importar» y elige el fichero descargado.</li>
          <li>Pulsa «Validar declaración»: el formulario comprueba los NIF contra el censo.</li>
          <li>Revisa los avisos, firma y envía antes del 31 de enero. Guarda el justificante.</li>
        </ol>
        <p className="small subtle" style={{ marginTop: 10 }}>
          Si la AEAT marca algún NIF como «no identificado», corrige ese donante en tu hoja y repite. Los registros con NIF
          no identificado no se aceptan.
        </p>
      </div>
    </div>
  );
}
