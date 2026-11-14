import { useEffect, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from 0 to `target` with an ease-out curve. */
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const R = 84;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * 0.75; // 270° sweep

/** 0-100 score on a 270° arc that sweeps in, with the number counting up in the middle. */
function ScoreGauge({ score, tone, label }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
  const [offset, setOffset] = useState(ARC);
  const shown = useCountUp(Math.round((Number(score) || 0) * 10) / 10);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(ARC * (1 - pct)));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className={`gauge tone-${tone}`} role="img" aria-label={`Tradeviser Score ${score} out of 100, ${label}`}>
      <svg viewBox="0 0 200 200" className="gauge-svg" aria-hidden="true">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--tone-from)" />
            <stop offset="100%" stopColor="var(--tone-to)" />
          </linearGradient>
        </defs>
        <circle className="gauge-track" cx="100" cy="100" r={R} strokeDasharray={`${ARC} ${CIRC}`} />
        {[0.25, 0.4, 0.55, 0.75].map((t) => {
          const a = ((135 + 270 * t) * Math.PI) / 180;
          return (
            <line
              key={t}
              className="gauge-tick"
              x1={100 + (R - 13) * Math.cos(a)}
              y1={100 + (R - 13) * Math.sin(a)}
              x2={100 + (R - 7) * Math.cos(a)}
              y2={100 + (R - 7) * Math.sin(a)}
            />
          );
        })}
        <circle
          className="gauge-value"
          cx="100"
          cy="100"
          r={R}
          stroke="url(#gauge-grad)"
          strokeDasharray={`${ARC} ${CIRC}`}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-score">{shown.toFixed(shown >= 100 ? 0 : 1)}</span>
        <span className="gauge-caption">Tradeviser Score</span>
      </div>
    </div>
  );
}

export default ScoreGauge;
