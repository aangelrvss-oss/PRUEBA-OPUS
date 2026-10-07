import { IconArrowRight, IconCheck, IconLock, IconX } from './icons';

const EXAMPLE = [
  { name: 'GARCÍA LÓPEZ, ANA', y: [300, 300, 360], ok: true, why: 'Recurrente · 45 %' },
  { name: 'PÉREZ RUIZ, LUIS', y: [300, 360, 300], ok: false, why: 'En 2025 bajó · 40 %' },
  { name: 'MORENO DÍAZ, RAÚL', y: [0, 200, 200], ok: false, why: 'No donó en 2023 · 80 %' },
];

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Para fundaciones y asociaciones de utilidad pública</p>
            <h1 style={{ marginTop: 14 }}>
              Tu Modelo 182, <em>cuadrado</em> antes del 31 de enero.
            </h1>
            <p className="lead">
              Arrastra tu hoja de donativos. Cuadra valida los NIF, agrupa los pagos por donante, calcula la recurrencia de
              cada uno con la regla vigente desde el ejercicio 2025 y genera el fichero que importas en el formulario de la
              AEAT.
            </p>
            <div className="hero-ctas">
              <a className="btn btn-primary btn-lg" href="#demo">
                Probar con datos de ejemplo <IconArrowRight />
              </a>
              <a className="btn btn-secondary btn-lg" href="#app">
                Usar mi archivo
              </a>
            </div>
            <div className="hero-trust">
              <span><IconLock /> Tus datos no salen del navegador</span>
              <span><IconCheck /> Sin registro</span>
              <span><IconCheck /> CSV, Excel o el .txt del 182</span>
            </div>
          </div>

          <figure className="ledger-card ledger" aria-label="Ejemplo de cálculo de recurrencia" style={{ margin: 0 }}>
            <div className="ledger-head">
              <span>recurrencia · ejercicio 2025</span>
              <span>ejemplo</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Donante</th><th>2023</th><th>2024</th><th>2025</th><th className="verdict">Resultado</th></tr>
                </thead>
                <tbody>
                  {EXAMPLE.map((d) => (
                    <tr key={d.name}>
                      <td>{d.name}</td>
                      {d.y.map((v, i) => (
                        <td key={i} className="num">{v ? `${v} €` : '—'}</td>
                      ))}
                      <td className="verdict">
                        <span className={`badge ${d.ok ? 'badge-ok' : 'badge-no'}`}>{d.why}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ledger-head" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                2182<b style={{ color: 'var(--ink)' }}>2025</b>G12345674…<b style={{ color: 'var(--accent-text)' }}>A04500</b>…<b style={{ color: 'var(--accent-text)' }}>1</b>
              </span>
              <span>250 pos.</span>
            </div>
          </figure>
        </div>
      </section>

      <section className="section" aria-labelledby="enero">
        <div className="container two-col">
          <div className="section-head">
            <p className="eyebrow">El problema</p>
            <h2 id="enero" style={{ marginTop: 10 }}>Lo que pasa cada enero en la tesorería</h2>
            <p>
              El 182 es obligatorio para las entidades acogidas a la Ley 49/2002, se presenta del 1 al 31 de enero y casi
              siempre recae en una persona voluntaria con una hoja de cálculo. Siete tareas, todas manuales:
            </p>
          </div>
          <div className="chores">
            {[
              ['Reunir todos los cobros del año', 'transferencias, Bizum, recibos, efectivo'],
              ['Sumar por donante y por clave', 'A, B, dinerario y en especie por separado'],
              ['Comprobar cada NIF', 'sin NIF válido no hay deducción'],
              ['Poner provincia y naturaleza', 'persona física, jurídica o entidad'],
              ['Buscar a cada donante en los dos años anteriores', 'la parte que más se equivoca'],
              ['Decidir el porcentaje de deducción', '80, 40, 45… o 85, 45, 50 en prioritarias'],
              ['Teclear o generar el fichero de 250 posiciones', 'y que la AEAT lo acepte'],
            ].map(([t, s], i) => (
              <div className="chore" key={t}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
                <span className="who subtle">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="cambio">
        <div className="container two-col">
          <div className="section-head">
            <p className="eyebrow">Lo que cambió</p>
            <h2 id="cambio" style={{ marginTop: 10 }}>Desde 2025, la recurrencia mira tres años, no dos</h2>
            <p>
              La Orden HAC/1430/2025 adaptó el campo «Recurrencia donativos» del 182 a la nueva redacción del artículo 19.1
              de la Ley 49/2002. Ahora también cuenta lo que el donante da en el propio ejercicio: si baja respecto al año
              anterior, deja de ser recurrente y su deducción por encima de 250 € pasa del 45 % al 40 %.
            </p>
            <p>
              Hacerlo a mano con BUSCARV entre tres hojas es lento y propenso a errores. Incluso algunas herramientas
              existentes siguen aplicando la regla anterior por defecto.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <blockquote className="quote" style={{ margin: 0 }}>
              <p>
                «Para poder aplicar en 2025 el porcentaje de deducción incrementado es necesario haber realizado donativos a
                la misma entidad en 2023 y 2024, y que la cuantía del donativo efectuado en 2025 y en 2024 sea igual o
                superior, en cada uno de ellos, al realizado en el año anterior.»
              </p>
              <cite>Agencia Tributaria, Manual práctico de Renta 2025, deducción por donativos</cite>
            </blockquote>
            <div className="alert alert-info">
              <IconCheck />
              <span className="alert-title">Cuadra explica cada decisión</span>
              <span className="alert-body">
                Para cada donante ves los importes de los tres años, si es recurrente y por qué, y el porcentaje que irá en
                el fichero. Puedes revisarlo antes de presentarlo.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona" tabIndex={-1} aria-labelledby="como">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Cómo funciona</p>
            <h2 id="como" style={{ marginTop: 10 }}>Tres pasos, unos minutos</h2>
          </div>
          <div className="steps">
            <div className="step">
              <h3>Arrastra tus archivos</h3>
              <p>
                La hoja de donativos del año (CSV o Excel, una fila por pago o por donante) y, para la recurrencia, los
                ficheros 182 que presentaste los dos años anteriores. Cuadra reconoce las columnas solo.
              </p>
            </div>
            <div className="step">
              <h3>Revisa lo que Cuadra encontró</h3>
              <p>
                NIF erróneos o ausentes, donantes sin provincia, nombres que no coinciden. Cada aviso dice qué fila es y qué
                hacer. La tabla de donantes muestra la recurrencia con sus números.
              </p>
            </div>
            <div className="step">
              <h3>Descarga e importa</h3>
              <p>
                Descarga el fichero en formato BOE e impórtalo en el formulario del Modelo 182 de la Sede de la AEAT
                (botón «Importar»). Guarda también el historial: el año que viene lo necesitarás.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="privacidad">
        <div className="container two-col">
          <div className="section-head">
            <p className="eyebrow">Privacidad</p>
            <h2 id="privacidad" style={{ marginTop: 10 }}>Los NIF de tus donantes no viajan a ningún sitio</h2>
            <p>
              Cuadra es una página que se ejecuta entera en tu navegador. No hay servidor que reciba tus archivos, ni
              cuentas, ni cookies. La página lleva una política de seguridad que impide al navegador enviar datos a
              cualquier dirección. Puedes comprobarlo en la pestaña «Red» de las herramientas de desarrollo.
            </p>
          </div>
          <div>
            <h3 style={{ marginBottom: 12 }}>Para quién es (y para quién no)</h3>
            <ul className="checklist">
              <li className="yes"><IconCheck /><span>Fundaciones y asociaciones de utilidad pública acogidas a la Ley 49/2002 (naturaleza del declarante 1).</span></li>
              <li className="yes"><IconCheck /><span>Donativos de clave A y B, dinerarios y en especie, de personas físicas, empresas y entidades.</span></li>
              <li className="yes"><IconCheck /><span>Gestorías que preparan el 182 de varias entidades pequeñas.</span></li>
              <li className="no"><IconX /><span>Partidos políticos, patrimonios protegidos y revocaciones de donativos.</span></li>
              <li className="no"><IconX /><span>Deducciones autonómicas: el campo se deja a cero.</span></li>
              <li className="no"><IconX /><span>Entidades con domicilio fiscal en País Vasco o Navarra, que presentan ante su Hacienda foral.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section" id="precios" tabIndex={-1} aria-labelledby="precios-t">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Precios</p>
            <h2 id="precios-t" style={{ marginTop: 10 }}>Generar el fichero es gratis</h2>
            <p>
              Los planes de pago son una hipótesis que estamos validando: hoy no se cobra nada y no hay nada que contratar.
            </p>
          </div>
          <div className="pricing">
            <div className="plan featured">
              <span className="badge badge-ok" style={{ justifySelf: 'start' }}>Disponible</span>
              <h3>Gratis</h3>
              <div className="price">0 €</div>
              <ul>
                <li>Fichero del Modelo 182</li>
                <li>Recurrencia y porcentajes explicados</li>
                <li>Informe de revisión e historial en CSV</li>
              </ul>
              <a className="btn btn-primary" href="#app">Abrir la herramienta</a>
            </div>
            <div className="plan">
              <span className="badge badge-no" style={{ justifySelf: 'start' }}>En validación</span>
              <h3>Entidad</h3>
              <div className="price">49 € <small>/ año (orientativo)</small></div>
              <ul>
                <li>Certificados de donación para cada donante (art. 24 Ley 49/2002)</li>
                <li>Historial de años anteriores guardado y cifrado</li>
                <li>Aviso cuando la AEAT cambie el diseño del 182</li>
              </ul>
            </div>
            <div className="plan">
              <span className="badge badge-no" style={{ justifySelf: 'start' }}>En validación</span>
              <h3>Gestoría</h3>
              <div className="price">190 € <small>/ año (orientativo)</small></div>
              <ul>
                <li>Varias entidades declarantes</li>
                <li>Plantillas de columnas por cliente</li>
                <li>Todo lo del plan Entidad</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="preguntas" tabIndex={-1} aria-labelledby="faq-t">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-head">
            <p className="eyebrow">Preguntas</p>
            <h2 id="faq-t" style={{ marginTop: 10 }}>Antes de usarlo</h2>
          </div>
          <div className="faq">
            <details>
              <summary>¿Cuadra presenta el 182 por mí?</summary>
              <p>
                No. Cuadra genera el fichero; tú lo importas en el formulario del Modelo 182 de la Sede electrónica de la
                AEAT (botón «Importar»), revisas y firmas con tu certificado o Cl@ve. Así la presentación sigue siendo
                tuya.
              </p>
            </details>
            <details>
              <summary>¿Es fiable el cálculo de la recurrencia?</summary>
              <p>
                Aplica la redacción vigente desde el ejercicio 2025: el donante debe haber donado a la entidad en los dos
                años anteriores, y ni el año anterior ni el actual pueden ser inferiores al año previo. La recurrencia solo
                es tan buena como el historial que aportes: sin los datos de esos dos años, todos los donantes salen como no
                recurrentes y Cuadra te avisa.
              </p>
            </details>
            <details>
              <summary>¿Qué formato tiene que tener mi hoja?</summary>
              <p>
                Cualquiera con una fila por pago o por donante y columnas para NIF, nombre e importe. La fecha (o el año) y el
                código postal son muy recomendables. Cuadra detecta las columnas por su título y puedes corregirlas. Puedes
                descargar una plantilla desde la herramienta.
              </p>
            </details>
            <details>
              <summary>¿Por qué no aparece la deducción autonómica?</summary>
              <p>
                Depende de cada comunidad autónoma y de la entidad. En esta versión el campo se rellena a cero. Si tu entidad
                da derecho a una deducción autonómica, revisa ese campo en el formulario de la AEAT después de importar.
              </p>
            </details>
            <details>
              <summary>¿Qué hago con los donativos sin NIF?</summary>
              <p>
                No se pueden declarar y el donante no podrá deducirse. Cuadra los lista con su fila e importe para que puedas
                pedir el NIF antes del 31 de enero.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ maxWidth: '22ch' }}>Pruébalo ahora con datos de ejemplo. Tarda menos de un minuto.</h2>
          <a className="btn btn-primary btn-lg" href="#demo">
            Ver el ejemplo <IconArrowRight />
          </a>
        </div>
      </section>
    </>
  );
}
