import { HiOutlineRefresh, HiOutlineClock, HiOutlineDatabase } from 'react-icons/hi';
import ScoreGauge from './ScoreGauge';
import { formatPrice, formatNumber, formatCompact, signalTone, timeAgo } from '../utils/format';

const HEALTH_LABEL = { good: 'Positive', bad: 'Negative', neutral: 'Neutral' };
const SIGNALS = ['STRONG SELL', 'SELL', 'HOLD', 'BUY', 'STRONG BUY'];
const SIGNAL_BANDS = [0, 25, 40, 55, 75, 100];

const has = (v) => v !== null && v !== undefined && v !== '';

function HealthChip({ health }) {
  if (!health) return null;
  return <span className={`chip chip-${health}`}>{HEALTH_LABEL[health] || 'Neutral'}</span>;
}

function Metric({ label, value, health, sub, children, i }) {
  const missing = !has(value) || value === '—';
  return (
    <div className={`metric${missing ? ' is-missing' : ''}`} style={{ '--i': i }}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {!missing && <HealthChip health={health} />}
      </div>
      <div className="metric-value mono">{missing ? '—' : value}</div>
      {sub && !missing && <div className="metric-sub">{sub}</div>}
      {!missing && children}
    </div>
  );
}

/** RSI on a 0-100 track with the oversold (<30) and overbought (>70) zones marked. */
function RsiBar({ rsi }) {
  return (
    <div className="minibar rsi-bar" aria-hidden="true">
      <span className="rsi-zone rsi-zone-low" />
      <span className="rsi-zone rsi-zone-high" />
      <span className="minibar-marker" style={{ left: `${Math.max(0, Math.min(100, rsi))}%` }} />
    </div>
  );
}

/** Where the price sits between the 20-day support (low) and resistance (high). */
function RangeBar({ low, high, price }) {
  const pos = high > low ? ((price - low) / (high - low)) * 100 : 50;
  return (
    <div className="range" aria-hidden="true">
      <div className="minibar range-bar">
        <span className="range-fill" style={{ width: `${Math.max(0, Math.min(100, pos))}%` }} />
        <span className="minibar-marker" style={{ left: `${Math.max(0, Math.min(100, pos))}%` }} />
      </div>
      <div className="range-labels mono">
        <span>{formatPrice(low)}</span>
        <span>{formatPrice(high)}</span>
      </div>
    </div>
  );
}

function SignalScale({ score, signal }) {
  const tone = signalTone(signal);
  return (
    <div className="scale" aria-label={`Signal scale: ${signal}`}>
      <div className="scale-track">
        {SIGNALS.map((s, idx) => (
          <span
            key={s}
            className={`scale-seg tone-${signalTone(s)}${s === signal ? ' is-active' : ''}`}
            style={{ flexGrow: SIGNAL_BANDS[idx + 1] - SIGNAL_BANDS[idx] }}
          />
        ))}
        <span className={`scale-marker tone-${tone}`} style={{ left: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <div className="scale-labels">
        {SIGNALS.map((s, idx) => (
          <span key={s} className={s === signal ? 'is-active' : ''} style={{ flexGrow: SIGNAL_BANDS[idx + 1] - SIGNAL_BANDS[idx] }}>
            {s === 'STRONG SELL' ? 'Strong sell' : s === 'STRONG BUY' ? 'Strong buy' : s[0] + s.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function ResultView({ entry, providerLabel, onRefresh, refreshing, nextRefreshAt, shared }) {
  const r = entry.result;
  const tone = signalTone(r.Signal);
  const company = r.CompanyName && r.CompanyName !== r.Ticker ? r.CompanyName : null;
  let i = 0;

  return (
    <div className="result" key={`${entry.id}-${entry.analyzedAt}`}>
      <section className={`card result-hero tone-${tone}`}>
        <div className="result-glow" aria-hidden="true" />
        <div className="result-id">
          <div className="result-ticker-row">
            <h2 className="result-ticker mono">{r.Ticker}</h2>
            <span className={`signal-pill tone-${tone}`}>{r.Signal}</span>
          </div>
          {company && <p className="result-company">{company}</p>}
          <p className="result-price mono">{formatPrice(r.Price)}</p>
          <div className="result-meta">
            <span>
              <HiOutlineDatabase aria-hidden="true" /> {providerLabel}
            </span>
            <span title={new Date(entry.analyzedAt).toLocaleString()}>
              <HiOutlineClock aria-hidden="true" /> Analyzed {timeAgo(entry.analyzedAt)}
            </span>
            {entry.fromCache && <span className="badge">{shared ? 'Shared result' : 'From history'}</span>}
          </div>
          {nextRefreshAt && Date.now() < nextRefreshAt ? (
            <p className="result-refresh-note">
              Results are shared for 30 minutes. Fresh data in {Math.max(1, Math.ceil((nextRefreshAt - Date.now()) / 60000))}m.
            </p>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing}>
              <HiOutlineRefresh aria-hidden="true" className={refreshing ? 'spin' : ''} /> Re-run analysis
            </button>
          )}
        </div>
        <ScoreGauge score={r.Score} tone={tone} label={r.Signal} />
      </section>

      <section className="card result-scale-card">
        <SignalScale score={r.Score} signal={r.Signal} />
      </section>

      <div className="groups">
        <section className="group">
          <h3 className="group-title">Technicals</h3>
          <div className="metric-grid">
            <Metric i={i++} label="RSI (14-day)" value={has(r.RSI) ? formatNumber(r.RSI) : null} health={r.RSIHealth}
              sub={has(r.RSI) ? (r.RSI < 30 ? 'Oversold' : r.RSI > 70 ? 'Overbought' : 'In range') : null}>
              <RsiBar rsi={r.RSI} />
            </Metric>
            <Metric i={i++} label="Trend" value={r.Trend} health={r.TrendHealth}
              sub={r.Trend === 'Bullish' ? 'Price > SMA50 > SMA200' : r.Trend === 'Bearish' ? 'Price < SMA50 < SMA200' : 'Mixed averages'} />
            <Metric i={i++} label="50-day average" value={has(r.SMA50) ? formatPrice(r.SMA50) : null} health={r.SMA50Health}
              sub={has(r.SMA50) && has(r.Price) ? (r.Price > r.SMA50 ? 'Price above' : 'Price below') : null} />
            <Metric i={i++} label="200-day average" value={has(r.SMA200) ? formatPrice(r.SMA200) : null} health={r.SMA200Health}
              sub={has(r.SMA200) && has(r.Price) ? (r.Price > r.SMA200 ? 'Price above' : 'Price below') : null} />
          </div>
        </section>

        <section className="group">
          <h3 className="group-title">Price levels</h3>
          <div className="metric-grid metric-grid--price">
            <Metric i={i++} label="20-day range"
              value={has(r.SupportLevel) && has(r.ResistanceLevel) ? `${formatPrice(r.SupportLevel)} – ${formatPrice(r.ResistanceLevel)}` : null}
              health={r.SupportHealth}
              sub="Support (low) to resistance (high)">
              {has(r.Price) && <RangeBar low={r.SupportLevel} high={r.ResistanceLevel} price={r.Price} />}
            </Metric>
            <Metric i={i++} label="Volume" value={has(r.TradingVolume) ? formatCompact(r.TradingVolume) : null} health={r.TradingVolumeHealth}
              sub="Last trading day" />
          </div>
        </section>

        <section className="group">
          <h3 className="group-title">Fundamentals &amp; outlook</h3>
          <div className="metric-grid">
            <Metric i={i++} label="P/E ratio" value={has(r.PERatio) ? formatNumber(r.PERatio) : null} health={r.PERatioHealth} />
            <Metric i={i++} label="EPS" value={has(r.EPS) ? formatPrice(r.EPS) : null} health={r.EPSHealth} />
            <Metric i={i++} label="Analyst view" value={r.AnalystRating} health={r.AnalystHealth} sub="From consensus price target" />
            <Metric i={i++} label="News sentiment" value={r.MarketSentiment} health={r.SentimentHealth}
              sub={has(r.SentimentScore) ? `Score ${r.SentimentScore.toFixed(2)}` : null} />
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResultView;
