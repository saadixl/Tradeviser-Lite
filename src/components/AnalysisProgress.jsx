import { HiCheck } from 'react-icons/hi';

/** Live checklist of the data being fetched, with a progress bar across the top. */
function AnalysisProgress({ ticker, providerLabel, steps, current }) {
  const pct = Math.min(100, Math.round(((current + 0.5) / steps.length) * 100));
  return (
    <section className="card progress-card" aria-live="polite" aria-busy="true">
      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-head">
        <div>
          <p className="eyebrow">Analyzing with {providerLabel}</p>
          <h2 className="progress-ticker mono">{ticker}</h2>
        </div>
        <span className="progress-pct mono">{pct}%</span>
      </div>
      <ol className="progress-steps">
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'pending';
          return (
            <li key={label} className={`progress-step is-${state}`} style={{ '--i': i }}>
              <span className="progress-step-icon" aria-hidden="true">
                {state === 'done' ? <HiCheck /> : state === 'active' ? <span className="spinner" /> : null}
              </span>
              <span>{label}</span>
              <span className="sr-only">{state === 'done' ? ' done' : state === 'active' ? ' in progress' : ''}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default AnalysisProgress;
