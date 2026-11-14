import { useEffect, useState } from 'react';
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

function App() {
  const [hash, setHash] = useState(currentHash);

  useEffect(() => {
    const onChange = () => {
      setHash(currentHash());
      document.querySelector('.app-main')?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const { Component } = PAGES.find((p) => p.hash === hash);

  return (
    <div className="App">
      <header className="app-header">
        <h1 className="app-title">Tradeviser Lite</h1>
        <nav className="app-nav" aria-label="Main">
          {PAGES.map((p) => (
            <a
              key={p.hash}
              href={p.hash}
              className={`app-nav-link${p.hash === hash ? ' app-nav-link--active' : ''}`}
              aria-current={p.hash === hash ? 'page' : undefined}
            >
              {p.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Component key={hash} />
        <footer className="app-disclaimer">
          For information and education only, not financial advice. Market data comes from the
          provider you choose and may be delayed or incomplete.
        </footer>
      </main>
    </div>
  );
}

export default App;
