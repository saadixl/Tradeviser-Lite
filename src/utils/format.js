const priceFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const formatPrice = (v) => (isNum(v) ? `$${priceFmt.format(v)}` : '—');
export const formatNumber = (v) => (isNum(v) ? priceFmt.format(v) : '—');
export const formatCompact = (v) => (isNum(v) ? compactFmt.format(v) : '—');

/** "STRONG BUY" -> "strong-buy", used for colour classes. */
export function signalTone(signal) {
  return String(signal || 'hold').toLowerCase().replace(/\s+/g, '-');
}

export function timeAgo(ts, now = Date.now()) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
