import { useEffect, useState } from 'react';
import { track } from '../analytics';
import { BrandMark } from './icons';
import { Landing } from './Landing';
import { Tool } from './Tool';

type Route = { page: 'landing' } | { page: 'app'; demo: boolean };

function parseRoute(hash: string): Route {
  if (hash.startsWith('#/app')) return { page: 'app', demo: hash.includes('demo') };
  return { page: 'landing' };
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => {
      const next = parseRoute(window.location.hash);
      setRoute((prev) => {
        // In-page anchors (#como-funciona) keep the landing page; only page changes reset scroll.
        if (prev.page !== next.page) window.scrollTo(0, 0);
        return next.page === prev.page && next.page === 'landing' ? prev : next;
      });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    track(route.page === 'app' ? 'tool_opened' : 'landing_viewed', route.page === 'app' ? { demo: route.demo } : {});
    document.title = route.page === 'app' ? 'Generar Modelo 182 · Cuadra' : 'Cuadra · Modelo 182 sin sustos';
  }, [route.page, route.page === 'app' && route.demo]);

  return (
    <>
      <header className="topbar">
        <div className="container">
          <a className="brand" href="#/" aria-label="Cuadra, inicio">
            <BrandMark className="brand-mark" />
            Cuadra <span className="brand-tag">182</span>
          </a>
          <nav className="topnav" aria-label="Principal">
            {route.page === 'landing' ? (
              <>
                <a className="navlink" href="#como-funciona" onClick={scrollTo('como-funciona')}>Cómo funciona</a>
                <a className="navlink" href="#precios" onClick={scrollTo('precios')}>Precios</a>
                <a className="navlink" href="#preguntas" onClick={scrollTo('preguntas')}>Preguntas</a>
                <a className="btn btn-primary btn-sm" href="#/app">Abrir la herramienta</a>
              </>
            ) : (
              <a className="navlink" href="#/" style={{ display: 'inline' }}>Qué es Cuadra</a>
            )}
          </nav>
        </div>
      </header>
      <main id="main">{route.page === 'app' ? <Tool key={String(route.demo)} startWithDemo={route.demo} /> : <Landing />}</main>
      <footer className="footer">
        <div className="container">
          <p>
            Cuadra no es un servicio de la Agencia Tributaria. Genera el fichero siguiendo el diseño de registro publicado
            por la AEAT para el Modelo 182; la presentación la haces tú en la Sede electrónica. Revisa siempre el resultado.
          </p>
          <p>Todo el procesamiento ocurre en tu navegador: esta página no puede enviar datos a ningún servidor.</p>
        </div>
      </footer>
    </>
  );
}

/** Smooth-scroll to an in-page section without changing the hash route. */
function scrollTo(id: string) {
  return (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };
}
