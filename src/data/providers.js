/** Market data providers used to analyze a stock. Each user brings their own API key. */
export const PROVIDER_MASSIVE = 'massive';
export const PROVIDER_ALPHAVANTAGE = 'alphavantage';

export const PROVIDERS = [
  { value: PROVIDER_MASSIVE, label: 'Massive', keyUrl: 'https://massive.com' },
  { value: PROVIDER_ALPHAVANTAGE, label: 'Alpha Vantage', keyUrl: 'https://www.alphavantage.co/support/#api-key' },
];

const storageKey = (provider) => `tradeviser-lite:api-key:${provider}`;
const listeners = new Set();

/** Called whenever a key in this browser is saved or removed. Returns unsubscribe. */
export function onLocalKeysChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * This browser's API keys live in localStorage and are sent only to their provider (or, if the
 * user chooses, encrypted to their account: see cloudKeys.js). Never display a key in full: use
 * maskApiKey(). To get the key an analysis should use, use useApiKey() from account.js.
 */
export function loadApiKey(provider) {
  try {
    return localStorage.getItem(storageKey(provider)) || '';
  } catch {
    return '';
  }
}

export function loadAllApiKeys() {
  return Object.fromEntries(PROVIDERS.map((p) => [p.value, loadApiKey(p.value)]));
}

export function saveApiKey(provider, key) {
  try {
    if (key) localStorage.setItem(storageKey(provider), key);
    else localStorage.removeItem(storageKey(provider));
  } catch {
    /* storage unavailable (private mode): the key still works for this visit */
  }
  listeners.forEach((fn) => fn());
}

/** Masked form for display: only the last 4 characters are ever shown. */
export function maskApiKey(key) {
  if (!key) return '';
  return `•••• ${key.slice(-4)}`;
}
