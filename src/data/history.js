/**
 * Recently analyzed tickers, cached with their full results in localStorage so they can be
 * reopened instantly. One entry per ticker + provider (the newest wins), newest first.
 */
const STORAGE_KEY = 'tradeviser-lite:history';
const MAX_ENTRIES = 40;

export const historyId = (ticker, provider) => `${provider}:${ticker}`;

export function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data.filter((e) => e && e.ticker && e.result) : [];
  } catch {
    return [];
  }
}

function persist(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or unavailable: the list still works for this visit */
  }
}

/** Adds (or replaces) an analysis at the top of the list and returns the new list. */
export function addToHistory(entries, entry) {
  const id = historyId(entry.ticker, entry.provider);
  const next = [{ ...entry, id }, ...entries.filter((e) => e.id !== id)].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

export function removeFromHistory(entries, id) {
  const next = entries.filter((e) => e.id !== id);
  persist(next);
  return next;
}

export function clearHistory() {
  persist([]);
  return [];
}
