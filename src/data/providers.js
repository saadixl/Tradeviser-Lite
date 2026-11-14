/** Market data providers the Playground can use. Each user brings their own API key. */
export const PROVIDER_MASSIVE = 'massive';
export const PROVIDER_ALPHAVANTAGE = 'alphavantage';

export const PROVIDERS = [
  { value: PROVIDER_MASSIVE, label: 'Massive', keyUrl: 'https://massive.com' },
  { value: PROVIDER_ALPHAVANTAGE, label: 'Alpha Vantage', keyUrl: 'https://www.alphavantage.co/support/#api-key' },
];

const storageKey = (provider) => `tradeviser-lite:api-key:${provider}`;

/** API keys live only in this browser's localStorage and are sent only to their provider. Never display a key in full: use maskApiKey(). */
export function loadApiKey(provider) {
  try {
    return localStorage.getItem(storageKey(provider)) || '';
  } catch {
    return '';
  }
}

export function saveApiKey(provider, key) {
  try {
    if (key) localStorage.setItem(storageKey(provider), key);
    else localStorage.removeItem(storageKey(provider));
  } catch {
    /* storage unavailable (private mode): the key still works for this visit */
  }
}

/** Masked form for display: only the last 4 characters are ever shown. */
export function maskApiKey(key) {
  if (!key) return '';
  return `•••• ${key.slice(-4)}`;
}
