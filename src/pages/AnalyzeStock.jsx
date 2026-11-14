import { useState, useMemo } from 'react';
import {
  HiOutlineLightningBolt,
  HiOutlineSearch,
  HiOutlineChevronDown,
  HiOutlineKey,
} from 'react-icons/hi';
import ScrollToTop from '../components/ScrollToTop';
import { PROVIDERS, PROVIDER_MASSIVE, loadApiKey, maskApiKey } from '../data/providers';
import { parseTickerFromInput, runPlaygroundAnalysis } from '../utils/playgroundSignals';

const PLAYGROUND_COLUMNS = [
  { key: 'Ticker', label: 'Ticker' },
  { key: 'CompanyName', label: 'Company' },
  { key: 'Score', label: 'Tradeviser Score' },
  { key: 'Signal', label: 'Tradeviser Signal' },
  { key: 'Price', label: 'Price' },
  { key: 'PERatio', label: 'P/E' },
  { key: 'EPS', label: 'EPS' },
  { key: 'RSI', label: 'RSI' },
  { key: 'SMA50', label: 'SMA50' },
  { key: 'SMA200', label: 'SMA200' },
  { key: 'SupportLevel', label: 'Support' },
  { key: 'ResistanceLevel', label: 'Resistance' },
  { key: 'AnalystRating', label: 'Analyst' },
  { key: 'Trend', label: 'Trend' },
  { key: 'MarketSentiment', label: 'Sentiment' },
  { key: 'TradingVolume', label: 'Volume' },
];

function formatVolume(num) {
  if (num == null || num === '') return '—';
  const n = Number(num);
  if (Number.isNaN(n)) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function healthClass(health) {
  if (!health || typeof health !== 'string') return '';
  const h = health.toLowerCase();
  if (h === 'good') return 'analysis-health-good';
  if (h === 'bad') return 'analysis-health-bad';
  return 'analysis-health-neutral';
}

function cellValue(row, col) {
  const v = row[col.key];
  if (v == null || v === '') return '—';
  if (col.key === 'TradingVolume') return formatVolume(v);
  if (typeof v === 'number' && col.key !== 'Score') return String(v);
  return String(v);
}

function healthKeyForColumn(colKey) {
  const map = {
    RSI: 'RSIHealth',
    SMA50: 'SMA50Health',
    SMA200: 'SMA200Health',
    Trend: 'TrendHealth',
    MarketSentiment: 'SentimentHealth',
    AnalystRating: 'AnalystHealth',
    PERatio: 'PERatioHealth',
    EPS: 'EPSHealth',
    SupportLevel: 'SupportHealth',
    ResistanceLevel: 'ResistanceHealth',
    TradingVolume: 'TradingVolumeHealth',
  };
  return map[colKey] || null;
}

function AnalyzeStock() {
  const [tickerInput, setTickerInput] = useState('');
  const [apiProvider, setApiProvider] = useState(PROVIDER_MASSIVE);
  const provider = PROVIDERS.find((p) => p.value === apiProvider) || PROVIDERS[0];
  const apiKey = loadApiKey(apiProvider);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  const handleAnalyze = async () => {
    const ticker = parseTickerFromInput(tickerInput);
    if (!ticker) {
      setAnalysisError('Enter a ticker symbol.');
      setResult(null);
      return;
    }
    setAnalysisError(null);
    setResult(null);
    setAnalyzing(true);
    try {
      const data = await runPlaygroundAnalysis(ticker, 'US', apiProvider, apiKey);
      setResult(data);
    } catch (e) {
      setAnalysisError(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const onFormKeyDown = (e) => {
    if (e.key !== 'Enter' || analyzing) return;
    if (e.target?.id !== 'playground-ticker-input') return;
    e.preventDefault();
    handleAnalyze();
  };

  const signalClass = useMemo(() => {
    if (!result?.Signal) return '';
    const s = result.Signal;
    if (s.includes('BUY')) return 'playground-signal playground-signal--buy';
    if (s.includes('SELL')) return 'playground-signal playground-signal--sell';
    return 'playground-signal playground-signal--hold';
  }, [result]);

  return (
    <div className="analysis-page-wrap">
      <ScrollToTop />
      <div className="analysis-page playground-page">
        <header className="analysis-header playground-header">
          <div className="playground-title-row">
            <h1 className="analysis-title">
              <HiOutlineLightningBolt className="analysis-header-icon" aria-hidden />
              Analyze a stock
            </h1>
            <p className="playground-lead">
              Stock signals from Massive or Alpha Vantage data, calculated in your browser with your own API key.
            </p>
          </div>
        </header>

        <section className="playground-panel" onKeyDown={onFormKeyDown}>
          <div className="playground-panel-head">
            <h2 className="playground-panel-title">Run analysis</h2>
          </div>

          <div className="playground-form">
            <div className="playground-col">
              <label className="playground-field-label" htmlFor="playground-ticker-input">
                Ticker
              </label>
              <div className="playground-combo">
                <HiOutlineSearch className="playground-combo-icon" aria-hidden />
                <input
                  id="playground-ticker-input"
                  type="text"
                  className="playground-combo-input"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value)}
                  placeholder="Type a symbol, e.g. AAPL"
                  autoComplete="off"
                  spellCheck="false"
                  aria-describedby="playground-ticker-hint"
                />
              </div>
              <p id="playground-ticker-hint" className="playground-field-hint">
                US equities. Enter any ticker symbol.
              </p>
            </div>

            <div className="playground-col">
              <label className="playground-field-label" htmlFor="playground-api-select">
                Data API
              </label>
              <div className="playground-select-wrap">
                <select
                  id="playground-api-select"
                  className="playground-select"
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  disabled={analyzing}
                >
                  {PROVIDERS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <HiOutlineChevronDown className="playground-select-chevron" aria-hidden />
              </div>
              <p className="playground-field-hint playground-field-hint--placeholder" aria-hidden="true">
                {'\u00a0'}
              </p>
            </div>

            <div className="playground-col playground-col--action">
              <span className="playground-field-label playground-field-label--spacer" aria-hidden="true">
                Ticker
              </span>
              <button
                type="button"
                className="btn btn-primary playground-analyze-btn"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing…' : 'Analyze'}
              </button>
              <p className="playground-field-hint playground-field-hint--kbd">Press Enter to run</p>
            </div>
          </div>

          <p className="playground-key-status">
            <HiOutlineKey className="playground-key-status-icon" aria-hidden />
            {apiKey ? (
              <>
                Using your {provider.label} key <span className="settings-key-mask">{maskApiKey(apiKey)}</span>
                {' · '}
                <a href="#/settings">Change in Settings</a>
              </>
            ) : (
              <>
                No {provider.label} API key yet. <a href="#/settings">Add one in Settings</a> to run an analysis.
              </>
            )}
          </p>

          {analysisError && (
            <p className="playground-alert playground-alert--error" role="alert">
              {analysisError}
            </p>
          )}
        </section>

        {result && (
          <section className="playground-result">
            <div className="playground-result-head">
              <h2 className="playground-result-title">Result</h2>
              {result.CompanyName && result.CompanyName !== result.Ticker && (
                <span className="playground-result-sub">{result.CompanyName}</span>
              )}
            </div>
            <div className={`playground-signal-wrap ${signalClass}`}>
              <span className="playground-signal-label">Signal</span>
              <span className="playground-signal-value">{result.Signal}</span>
              <span className="playground-score">Score {result.Score ?? '—'}</span>
            </div>
            <div className="playground-metrics">
              {PLAYGROUND_COLUMNS.map((col) => {
                const hk = healthKeyForColumn(col.key);
                const health = hk ? result[hk] : null;
                const extra = hk ? healthClass(health) : '';
                return (
                  <div key={col.key} className={`playground-metric ${extra}`}>
                    <span className="playground-metric-label">{col.label}</span>
                    <span className="playground-metric-value">{cellValue(result, col)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AnalyzeStock;
