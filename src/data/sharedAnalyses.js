/**
 * Shared analysis cache in Firebase Realtime Database, at Tradeviser-Lite/Analysis/<ticker>.
 *
 * - Before analyzing, check the cache: a result 30 minutes old or less is reused, so a
 *   visitor doesn't need an API key for a ticker someone analyzed recently.
 * - After a fresh analysis, the result is saved with the database server's timestamp.
 * - The Recent list shows the 20 latest analyses from everyone.
 *
 * Optional: without the VITE_FIREBASE_* settings (.env.local) the app keeps history in the
 * browser only. The database rules (see README) allow public reads and validated writes only.
 */
import {
  ref,
  get,
  set,
  query,
  orderByChild,
  limitToLast,
  onValue,
  serverTimestamp,
} from 'firebase/database';
import { db } from './firebase';

export const FRESH_MS = 30 * 60 * 1000;
const ROOT = 'Tradeviser-Lite/Analysis';
const RECENT_LIMIT = 20;

export const sharedEnabled = Boolean(db);

/** Database keys can't contain "." (BRK.B -> BRK-B). */
export const tickerKey = (ticker) => String(ticker).toUpperCase().replace(/\./g, '-');

const toEntry = (key, v) =>
  v && v.result && v.ticker
    ? { id: key, ticker: v.ticker, provider: v.provider, analyzedAt: v.analyzedAt, result: v.result }
    : null;

export const isFresh = (entry, now = Date.now()) => Boolean(entry && now - entry.analyzedAt <= FRESH_MS);

/** The cached analysis for a ticker, or null. */
export async function getCachedAnalysis(ticker) {
  if (!db) return null;
  try {
    const key = tickerKey(ticker);
    const snap = await get(ref(db, `${ROOT}/${key}`));
    return toEntry(key, snap.val());
  } catch (e) {
    console.warn('Could not read the shared cache:', e);
    return null;
  }
}

/** Keep only what the database rules accept: short strings, numbers and booleans. */
function sanitizeResult(result) {
  const out = {};
  Object.entries(result || {}).forEach(([k, v]) => {
    if (!/^[A-Za-z0-9]{1,30}$/.test(k) || v === null || v === undefined) return;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, k === 'CompanyName' ? 200 : 40);
  });
  return out;
}

/** Saves a fresh analysis. Failures (for example someone saved it a moment earlier) are ignored. */
export async function saveAnalysis({ ticker, provider, result }) {
  if (!db) return;
  try {
    await set(ref(db, `${ROOT}/${tickerKey(ticker)}`), {
      ticker,
      provider,
      analyzedAt: serverTimestamp(),
      result: sanitizeResult(result),
    });
  } catch (e) {
    console.warn('Could not save to the shared cache:', e?.message || e);
  }
}

/** Calls back with the latest analyses (newest first) whenever they change. Returns unsubscribe. */
export function subscribeRecent(callback) {
  if (!db) return () => {};
  const q = query(ref(db, ROOT), orderByChild('analyzedAt'), limitToLast(RECENT_LIMIT));
  return onValue(
    q,
    (snap) => {
      const list = [];
      snap.forEach((child) => {
        const e = toEntry(child.key, child.val());
        if (e) list.push(e);
      });
      callback(list.sort((a, b) => b.analyzedAt - a.analyzedAt));
    },
    (e) => console.warn('Could not load recent analyses:', e)
  );
}
