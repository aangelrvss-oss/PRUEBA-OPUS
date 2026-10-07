import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bucket, track } from '../analytics';
import { entityProblems, type EntityInfo } from '../core/boe182';
import { buildDemo, TEMPLATE_CSV } from '../core/demo';
import { FileReadError, loadFile } from '../core/files';
import { validateNif } from '../core/nif';
import { RULESET } from '../core/rules';
import { guessYear, makeSource, runWorkflow, type Source } from '../core/workflow';
import { saveFile, storage } from './download';
import { DownloadPanel, EntityForm } from './Finish';
import { IconAlert, IconInfo, IconLock } from './icons';
import { DonorTable, Issues, Stats } from './Results';
import { DropZone, SourceCard } from './Sources';

const EMPTY_ENTITY: EntityInfo = { nif: '', name: '', phone: '', contactName: '', receiptNumber: '', replacement: '', previousReceiptNumber: '' };
const DEMO_ENTITY: EntityInfo = { ...EMPTY_ENTITY, nif: 'G12345674', name: 'Asociación Ejemplo de Ayuda Mutua', phone: '910000000', contactName: 'Ejemplo Ejemplo Tesorería' };
const ENTITY_KEY = 'cuadra.entity.v1';

let nextId = 1;

export function Tool({ startWithDemo }: { startWithDemo: boolean }) {
  const [sources, setSources] = useState<Source[]>([]);
  const sourcesRef = useRef<Source[]>([]);
  sourcesRef.current = sources;
  const [yearOverride, setYearOverride] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [entity, setEntity] = useState<EntityInfo>(() => storage.get(ENTITY_KEY, EMPTY_ENTITY));
  const [showEntityErrors, setShowEntityErrors] = useState(false);
  const entityRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const addFiles = useCallback(async (files: File[], opts: { demo?: boolean } = {}) => {
    setBusy(true);
    setLoadErrors([]);
    const errors: string[] = [];
    const added: Source[] = [];
    for (const f of files) {
      try {
        const loaded = await loadFile(f);
        added.push(makeSource(`s${nextId++}`, loaded));
        track('file_added', { kind: loaded.kind, ext: f.name.split('.').pop()?.toLowerCase() ?? '', demo: !!opts.demo });
      } catch (e) {
        const msg = e instanceof FileReadError ? e.message : `No se pudo leer "${f.name}": ${(e as Error).message}`;
        errors.push(msg);
        track('file_rejected', { reason: e instanceof FileReadError ? 'known' : 'unexpected' });
      }
    }
    const replaced: string[] = [];
    let next: Source[];
    if (opts.demo) next = added;
    else {
      // Re-uploading a corrected file with the same name replaces the old one
      // instead of adding its donations a second time.
      next = [...sourcesRef.current];
      for (const a of added) {
        const i = next.findIndex((p) => p.file.name === a.file.name);
        if (i >= 0) {
          next[i] = a;
          replaced.push(a.file.name);
        } else next.push(a);
      }
    }
    sourcesRef.current = next;
    setSources(next);
    setNotice(replaced.length ? `Se ha sustituido ${replaced.join(', ')} por la versión nueva.` : null);
    setLoadErrors(errors);
    setBusy(false);
    if (added.length && !opts.demo) requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const loadDemo = useCallback(() => {
    const demo = buildDemo();
    setIsDemo(true);
    setYearOverride(null);
    setEntity(DEMO_ENTITY);
    track('demo_loaded');
    void addFiles(
      [new File([demo.current.text], demo.current.name, { type: 'text/csv' }), new File([demo.history.text], demo.history.name, { type: 'text/csv' })],
      { demo: true },
    );
  }, [addFiles]);

  useEffect(() => {
    if (startWithDemo) loadDemo();
  }, [startWithDemo, loadDemo]);

  useEffect(() => {
    if (!isDemo) storage.set(ENTITY_KEY, { ...entity, replacement: '', previousReceiptNumber: '', receiptNumber: '' });
  }, [entity, isDemo]);

  const guessed = useMemo(() => guessYear(sources), [sources]);
  const year = yearOverride ?? guessed;
  const result = useMemo(() => (sources.length ? runWorkflow(sources, year) : null), [sources, year]);
  const entityNif = useMemo(() => {
    const v = validateNif(entity.nif);
    return v.ok ? v.nif : '';
  }, [entity.nif]);

  useEffect(() => {
    if (!result || result.blocked) return;
    const d = result.declaration;
    track('declaration_computed', {
      donors: bucket(d.stats.donorsIncluded),
      recurrent: bucket(d.stats.recurrentDonors),
      errors: bucket(d.issues.filter((i) => i.severity === 'error').length),
      hasHistory: d.historyYears.length > 0,
      demo: isDemo,
    });
  }, [result, isDemo]);

  const startOwn = () => {
    setSources([]);
    setIsDemo(false);
    setYearOverride(null);
    setEntity(storage.get(ENTITY_KEY, EMPTY_ENTITY));
    window.location.hash = '#/app';
  };

  const years: number[] = [];
  for (let y = Math.max(new Date().getFullYear(), guessed); y >= RULESET.validFromYear; y--) years.push(y);

  const d = result && !result.blocked ? result.declaration : null;

  return (
    <div className="container tool">
      <div className="tool-head">
        <div>
          <p className="eyebrow">Modelo 182 · declaración informativa de donativos</p>
          <h1 style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            Ejercicio
            <label className="visually-hidden" htmlFor="year">Ejercicio que declaras</label>
            <select
              id="year"
              className="select"
              style={{ width: 'auto', font: 'inherit', fontWeight: 600, minHeight: 0, padding: '0 40px 0 10px' }}
              value={year}
              onChange={(e) => setYearOverride(Number(e.target.value))}
              data-testid="year-select"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </h1>
          <p className="muted small" style={{ marginTop: 6 }}>Se presenta en enero de {year + 1}. Reglas: {RULESET.label}.</p>
        </div>
        <span className="privacy-pill"><IconLock /> Procesado en tu navegador · nada se sube</span>
      </div>

      {isDemo && (
        <div className="alert alert-info" data-testid="demo-banner">
          <IconInfo />
          <span className="alert-title">Estás viendo datos de ejemplo, inventados</span>
          <span className="alert-body">
            36 donantes ficticios con tres años de historia y algunos errores puestos a propósito para que veas cómo se
            avisan.{' '}
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 6 }} onClick={startOwn}>Empezar con mis archivos</button>
          </span>
        </div>
      )}

      <section className="panel panel-pad" aria-labelledby="files-h">
        <div className="panel-head">
          <h2 id="files-h" style={{ fontSize: '1.2rem' }}>1 · Archivos</h2>
          {sources.length === 0 && (
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveFile(TEMPLATE_CSV, 'plantilla_donativos.csv', 'text/csv;charset=utf-8')}>Descargar plantilla</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadDemo} data-testid="load-demo">Cargar datos de ejemplo</button>
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {sources.length > 0 && result && (
            <div className="files">
              {sources.map((s) => (
                <SourceCard
                  key={s.id}
                  source={s}
                  summary={result.summaries.find((x) => x.id === s.id)!}
                  year={year}
                  entityNif={entityNif}
                  onChange={(next) => {
                    setSources((prev) => prev.map((p) => (p.id === s.id ? next : p)));
                    track('mapping_changed');
                  }}
                  onRemove={() => setSources((prev) => prev.filter((p) => p.id !== s.id))}
                />
              ))}
            </div>
          )}
          <DropZone onFiles={(f) => void addFiles(f)} compact={sources.length > 0} busy={busy} />
          {notice && (
            <p className="badge badge-info" role="status" style={{ whiteSpace: 'normal', justifySelf: 'start' }}>{notice}</p>
          )}
          {loadErrors.map((e) => (
            <div key={e} className="alert alert-error" role="alert">
              <IconAlert />
              <span className="alert-title">No se pudo usar un archivo</span>
              <span className="alert-body">{e}</span>
            </div>
          ))}
          {result && result.declaration.historyYears.length === 0 && !result.blocked && result.declaration.donors.length > 0 && (
            <p className="small muted">
              Consejo: añade los ficheros 182 de {year - 2} y {year - 1} (el .txt que exporta el formulario de la AEAT o el que
              generaste) para que Cuadra calcule la recurrencia.
            </p>
          )}
        </div>
      </section>

      <section ref={resultsRef} aria-labelledby="review-h" style={{ display: 'grid', gap: 16, scrollMarginTop: 80 }}>
        {!result && (
          <div className="panel panel-pad empty">
            <h2 id="review-h" style={{ fontSize: '1.2rem', marginBottom: 8 }}>2 · Revisión</h2>
            <p>Aquí verás los donantes, su recurrencia y los problemas a corregir en cuanto cargues un archivo.</p>
          </div>
        )}
        {result?.blocked && (
          <div className="alert alert-warn">
            <IconAlert />
            <span className="alert-title" id="review-h">Falta indicar algunas columnas</span>
            <span className="alert-body">Elige en la tarjeta del archivo qué columna contiene el NIF, el nombre y el importe.</span>
          </div>
        )}
        {d && (
          <>
            <div className="panel panel-pad fade-in">
              <div className="panel-head">
                <h2 id="review-h" style={{ fontSize: '1.2rem' }}>2 · Revisión</h2>
                <p>Historial usado: {d.historyYears.length ? d.historyYears.join(' y ') : 'ninguno'}</p>
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                <Stats d={d} />
                <Issues issues={d.issues} />
              </div>
            </div>
            <div className="panel panel-pad">
              <div className="panel-head">
                <h3>Donantes</h3>
                <p>Despliega un donante para ver el porqué y su registro exacto en el fichero.</p>
              </div>
              <DonorTable d={d} declarantNif={entityNif} />
            </div>
          </>
        )}
      </section>

      {d && (
        <section ref={entityRef} className="panel panel-pad" aria-labelledby="finish-h" style={{ scrollMarginTop: 80 }}>
          <div className="panel-head">
            <h2 id="finish-h" style={{ fontSize: '1.2rem' }}>3 · Entidad y descarga</h2>
            {entityProblems(entity).length === 0 && <span className="badge badge-ok">Datos completos</span>}
          </div>
          <div style={{ display: 'grid', gap: 24 }}>
            <EntityForm entity={entity} onChange={setEntity} showErrors={showEntityErrors} />
            <hr className="divider" style={{ margin: 0 }} />
            <DownloadPanel
              d={d}
              entity={entity}
              onNeedEntity={() => {
                setShowEntityErrors(true);
                entityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                requestAnimationFrame(() => document.getElementById(`entity-${entityProblems(entity)[0]?.field ?? 'nif'}`)?.focus());
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
