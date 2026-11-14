import { useEffect, useRef, useState } from 'react';
import { HiOutlineSearch, HiArrowRight, HiOutlineExclamationCircle, HiOutlineKey } from 'react-icons/hi';
import { PROVIDERS, PROVIDER_MASSIVE, loadApiKey, maskApiKey } from '../data/providers';
import { loadHistory, addToHistory, removeFromHistory, clearHistory, historyId } from '../data/history';
import { sharedEnabled, getCachedAnalysis, saveAnalysis, subscribeRecent, isFresh, tickerKey, FRESH_MS } from '../data/sharedAnalyses';
import { ANALYSIS_STEPS, parseTickerFromInput, runPlaygroundAnalysis } from '../utils/playgroundSignals';
import AnalysisProgress from '../components/AnalysisProgress';
import ResultView from '../components/ResultView';
import HistoryList from '../components/HistoryList';

const PROVIDER_PREF_KEY = 'tradeviser-lite:provider';

function loadProviderPref() {
  try {
    const v = localStorage.getItem(PROVIDER_PREF_KEY);
    return PROVIDERS.some((p) => p.value === v) ? v : PROVIDER_MASSIVE;
  } catch {
    return PROVIDER_MASSIVE;
  }
}

const providerLabel = (value) => PROVIDERS.find((p) => p.value === value)?.label || value;

function AnalyzeStock() {
  const [tickerInput, setTickerInput] = useState('');
  const [provider, setProvider] = useState(loadProviderPref);
  // Recent: the 20 latest shared analyses when the shared cache is on, otherwise this browser's history.
  const [history, setHistory] = useState(() => (sharedEnabled ? [] : loadHistory()));
  const [current, setCurrent] = useState(null); // { id, ticker, provider, analyzedAt, result, fromCache }
  const [run, setRun] = useState(null); // { ticker, provider, step }
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const runId = useRef(0);

  const apiKey = loadApiKey(provider);
  const running = Boolean(run);

  useEffect(() => (sharedEnabled ? subscribeRecent(setHistory) : undefined), []);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_PREF_KEY, provider);
    } catch {
      /* ignore */
    }
  }, [provider]);

  // "/" focuses the search, like a command bar.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const analyze = async (rawTicker = tickerInput, prov = provider) => {
    const ticker = parseTickerFromInput(rawTicker);
    if (!ticker) {
      setError({ message: 'Enter a ticker symbol, for example AAPL.' });
      inputRef.current?.focus();
      return;
    }
    const id = ++runId.current;
    setError(null);

    // A shared result 30 minutes old or less is reused (no API key needed).
    if (sharedEnabled) {
      setRun({ ticker, provider: prov, step: 0, checkingCache: true });
      const cached = await getCachedAnalysis(ticker);
      if (runId.current !== id) return;
      if (isFresh(cached)) {
        setRun(null);
        setCurrent({ ...cached, fromCache: true });
        return;
      }
    }

    const key = loadApiKey(prov);
    if (!key) {
      setRun(null);
      setError({ message: `Add your ${providerLabel(prov)} API key in Settings to run an analysis.`, needsKey: true });
      return;
    }
    setRun({ ticker, provider: prov, step: 0 });
    try {
      const result = await runPlaygroundAnalysis(ticker, 'US', prov, key, (step) => {
        if (runId.current === id) setRun((r) => (r ? { ...r, step } : r));
      });
      if (runId.current !== id) return;
      const entry = { ticker, provider: prov, analyzedAt: Date.now(), result };
      if (sharedEnabled) {
        saveAnalysis(entry); // the Recent list updates from the database
        setCurrent({ ...entry, id: tickerKey(ticker), fromCache: false });
      } else {
        setHistory((h) => addToHistory(h, entry));
        setCurrent({ ...entry, id: historyId(ticker, prov), fromCache: false });
      }
    } catch (e) {
      if (runId.current === id) setError({ message: e.message || 'Analysis failed. Please try again.' });
    } finally {
      if (runId.current === id) setRun(null);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!running) analyze();
  };

  const openFromHistory = (entry) => {
    runId.current += 1; // cancel any run in progress
    setRun(null);
    setError(null);
    setCurrent({ ...entry, fromCache: true });
    setTickerInput(entry.ticker);
    setProvider(entry.provider);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (id) => {
    setHistory((h) => removeFromHistory(h, id));
    if (current?.id === id) setCurrent(null);
  };

  const steps = run ? ANALYSIS_STEPS[run.provider] : [];

  return (
    <div className="page analyze">
      <header className="hero">
        <p className="eyebrow eyebrow-accent">Stock signals, in your browser</p>
        <h1 className="hero-title">
          Analyze a stock <span className="hero-title-soft">in seconds.</span>
        </h1>
        <p className="hero-lead">
          Momentum, moving averages, analyst targets and news sentiment, distilled into one score from 0 to 100.
        </p>
      </header>

      <form className="search" onSubmit={onSubmit} role="search">
        <div className="search-field">
          <HiOutlineSearch className="search-icon" aria-hidden="true" />
          <label htmlFor="ticker" className="sr-only">Ticker symbol</label>
          <input
            id="ticker"
            ref={inputRef}
            className="search-input mono"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Escape' && setTickerInput('')}
            placeholder="Ticker, e.g. NVDA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            enterKeyHint="go"
          />
          {!tickerInput && <kbd className="kbd" aria-hidden="true">/</kbd>}
        </div>

        <div className="segmented" role="radiogroup" aria-label="Data provider">
          {PROVIDERS.map((p) => {
            const hasKey = Boolean(loadApiKey(p.value));
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={provider === p.value}
                className={`segmented-btn${provider === p.value ? ' is-active' : ''}`}
                onClick={() => setProvider(p.value)}
                disabled={running}
                title={hasKey ? `${p.label} key saved` : `No ${p.label} key yet`}
              >
                <span className={`key-dot${hasKey ? ' has-key' : ''}`} aria-hidden="true" />
                {p.label}
              </button>
            );
          })}
        </div>

        <button type="submit" className="btn btn-primary search-go" disabled={running}>
          {running ? (
            <>
              <span className="spinner spinner-light" aria-hidden="true" /> Analyzing
            </>
          ) : (
            <>
              Analyze <HiArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="key-line">
        <HiOutlineKey aria-hidden="true" />
        {apiKey ? (
          <>
            Using your {providerLabel(provider)} key <span className="mono key-mask">{maskApiKey(apiKey)}</span>
            <a href="#/settings">Manage</a>
          </>
        ) : (
          <>
            No {providerLabel(provider)} key yet. <a href="#/settings">Add one in Settings</a>
          </>
        )}
      </p>

      <div className="analyze-layout">
        <div className="analyze-main">
          {error && (
            <div className="card alert" role="alert">
              <HiOutlineExclamationCircle aria-hidden="true" />
              <span>{error.message}</span>
              {error.needsKey && (
                <a className="btn btn-primary btn-sm" href="#/settings">
                  Open Settings
                </a>
              )}
            </div>
          )}

          {run ? (
            <AnalysisProgress
              ticker={run.ticker}
              providerLabel={providerLabel(run.provider)}
              steps={steps}
              current={run.checkingCache ? -1 : run.step}
              checking={Boolean(run.checkingCache)}
            />
          ) : current ? (
            <ResultView
              entry={current}
              providerLabel={providerLabel(current.provider)}
              refreshing={running}
              onRefresh={() => analyze(current.ticker, current.provider)}
              nextRefreshAt={sharedEnabled ? current.analyzedAt + FRESH_MS : null}
              shared={sharedEnabled}
            />
          ) : (
            !error && (
              <div className="card empty">
                <div className="empty-art" aria-hidden="true">
                  <svg viewBox="0 0 120 64">
                    <defs>
                      <linearGradient id="empty-line" x1="0" x2="1">
                        <stop offset="0" stopColor="#6366f1" />
                        <stop offset="1" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                    <path d="M4 52 L28 40 L44 46 L64 22 L82 30 L104 10 L116 14" fill="none" stroke="url(#empty-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="empty-title">Start with a ticker</h2>
                <p className="empty-text">
                  Type a US ticker above and press Enter. Each analysis checks up to eight data points and
                  lands in your recent list.
                </p>
                <div className="empty-tags">
                  {['RSI', 'SMA 50/200', 'Trend', 'Support & resistance', 'P/E & EPS', 'Analyst targets', 'News sentiment'].map((t, i) => (
                    <span key={t} className="tag" style={{ '--i': i }}>{t}</span>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <HistoryList
          entries={history}
          activeId={current?.id}
          providerLabel={providerLabel}
          onSelect={openFromHistory}
          readOnly={sharedEnabled}
          onRemove={remove}
          onClear={() => {
            setHistory(clearHistory());
            setCurrent(null);
          }}
        />
      </div>
    </div>
  );
}

export default AnalyzeStock;
