import { useEffect, useState } from 'react';
import { HiOutlineX, HiOutlineClock } from 'react-icons/hi';
import { signalTone, timeAgo } from '../utils/format';

/** Recently analyzed tickers. Selecting one reopens its cached result instantly. */
function HistoryList({ entries, activeId, providerLabel, onSelect, onRemove, onClear, readOnly }) {
  const [confirming, setConfirming] = useState(false);
  const [, setNow] = useState(Date.now());

  // Keep "5m ago" labels fresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!confirming) return undefined;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <aside className="card history" aria-labelledby="history-title">
      <div className="history-head">
        <h2 id="history-title" className="history-title" title={readOnly ? 'Latest 20 analyses from everyone' : undefined}>
          <HiOutlineClock aria-hidden="true" /> Recent
          {entries.length > 0 && <span className="history-count">{entries.length}</span>}
        </h2>
        {!readOnly && entries.length > 0 && (
          <button
            type="button"
            className={`btn btn-ghost btn-xs${confirming ? ' is-danger' : ''}`}
            onClick={() => {
              if (confirming) {
                onClear();
                setConfirming(false);
              } else {
                setConfirming(true);
              }
            }}
          >
            {confirming ? 'Confirm clear' : 'Clear'}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="history-empty">
          {readOnly
            ? 'The latest analyses from everyone appear here. Open one to see its result instantly.'
            : 'Tickers you analyze appear here with their results, saved in this browser so you can reopen them instantly.'}
        </p>
      ) : (
        <ul className="history-list">
          {entries.map((e, idx) => {
            const tone = signalTone(e.result.Signal);
            const name = e.result.CompanyName && e.result.CompanyName !== e.ticker ? e.result.CompanyName : '';
            return (
              <li key={e.id} className="history-item-wrap" style={{ '--i': Math.min(idx, 12) }}>
                <button
                  type="button"
                  className={`history-item${e.id === activeId ? ' is-active' : ''}${readOnly ? ' is-readonly' : ''}`}
                  onClick={() => onSelect(e)}
                  aria-current={e.id === activeId ? 'true' : undefined}
                >
                  <span className={`history-dot tone-${tone}`} aria-hidden="true" />
                  <span className="history-main">
                    <span className="history-ticker mono">{e.ticker}</span>
                    <span className="history-name">{name || providerLabel(e.provider)}</span>
                  </span>
                  <span className="history-side">
                    <span className={`history-signal tone-${tone}`}>{e.result.Signal}</span>
                    <span className="history-time">
                      <span className="mono">{Math.round(e.result.Score)}</span> · {timeAgo(e.analyzedAt)}
                    </span>
                  </span>
                </button>
                {!readOnly && (
                <button
                  type="button"
                  className="history-remove"
                  onClick={() => onRemove(e.id)}
                  aria-label={`Remove ${e.ticker} from recent`}
                  title="Remove"
                >
                  <HiOutlineX aria-hidden="true" />
                </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export default HistoryList;
