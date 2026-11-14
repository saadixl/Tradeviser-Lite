import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.css';
import AnalyzeStock from './pages/AnalyzeStock';
import Settings from './pages/Settings';

const PAGES = [
  { hash: '#/', label: 'Analyze a stock', Component: AnalyzeStock },
  { hash: '#/settings', label: 'Settings', Component: Settings },
];

function currentHash() {
  return PAGES.some((p) => p.hash === window.location.hash) ? window.location.hash : '#/';
}

function Logo() {
  return (
    <a href="#/" className="brand" aria-label="Tradeviser Lite home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3 17l5-5 4 3 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 6h5v5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="brand-name">
        Tradeviser <span className="brand-lite">Lite</span>
      </span>
    </a>
  );
}

/** Pill navigation with an indicator that slides to the active page. */
function Nav({ hash }) {
  const refs = useRef({});
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[hash];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [hash]);

  return (
    <nav className="nav" aria-label="Main">
      {indicator && <span className="nav-indicator" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }} />}
      {PAGES.map((p) => (
        <a
          key={p.hash}
          ref={(el) => (refs.current[p.hash] = el)}
          href={p.hash}
          className={`nav-link${p.hash === hash ? ' is-active' : ''}`}
          aria-current={p.hash === hash ? 'page' : undefined}
        >
          {p.label}
        </a>
      ))}
    </nav>
  );
}

function App() {
  const [hash, setHash] = useState(currentHash);

  useEffect(() => {
    const onChange = () => {
      setHash(currentHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const { Component } = PAGES.find((p) => p.hash === hash);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <Nav hash={hash} />
        </div>
      </header>
      <main className="main">
        <Component key={hash} />
      </main>
      <footer className="footer">
        <p>
          For information and education only, not financial advice. Market data comes from the provider you
          choose and may be delayed or incomplete.
        </p>
      </footer>
    </div>
  );
}

export default App;
