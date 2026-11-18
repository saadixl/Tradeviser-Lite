/**
 * API keys kept in the user's Tradeviser account, at Users/<uid>/apiKeys/<provider>.
 *
 * Each key is encrypted in the browser with AES-GCM before it's written. The AES key is derived
 * from the user's uid (PBKDF2-SHA-256), so the same account decrypts it on any device and the
 * database only ever holds { iv, data, updatedAt }. The uid isn't a secret: what keeps the keys
 * private is the database rule that only the signed-in owner can read Users/<uid>/apiKeys.
 */
import { ref, onValue, update, remove, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

const SALT = 'tradeviser-lite:api-keys:v1';
const ITERATIONS = 150000;
const path = (uid) => `Users/${uid}/apiKeys`;

const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const keyCache = new Map();
function deriveKey(uid) {
  if (!keyCache.has(uid)) {
    keyCache.set(
      uid,
      (async () => {
        const base = await crypto.subtle.importKey('raw', enc.encode(uid), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      })()
    );
  }
  return keyCache.get(uid);
}

export async function encryptApiKey(uid, apiKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(uid), enc.encode(apiKey));
  return { iv: toB64(iv), data: toB64(data) };
}

export async function decryptApiKey(uid, { iv, data }) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, await deriveKey(uid), fromB64(data));
  return dec.decode(plain);
}

/** Encrypts and saves the given keys ({ massive: '...', alphavantage: '...' }); empty ones are skipped. */
export async function saveCloudKeys(uid, keys) {
  const updates = {};
  for (const [provider, apiKey] of Object.entries(keys)) {
    if (!apiKey) continue;
    updates[provider] = { ...(await encryptApiKey(uid, apiKey)), updatedAt: serverTimestamp() };
  }
  if (Object.keys(updates).length) await update(ref(db, path(uid)), updates);
}

export function deleteCloudKeys(uid) {
  return remove(ref(db, path(uid)));
}

/**
 * Calls back with the decrypted cloud keys whenever they change:
 * { keys: { massive: '...' }, updatedAt: { massive: 1700000000000 } }. Returns unsubscribe.
 */
export function subscribeCloudKeys(uid, callback, onError) {
  return onValue(
    ref(db, path(uid)),
    async (snap) => {
      const keys = {};
      const updatedAt = {};
      const entries = Object.entries(snap.val() || {});
      await Promise.all(
        entries.map(async ([provider, v]) => {
          try {
            keys[provider] = await decryptApiKey(uid, v);
            updatedAt[provider] = v.updatedAt;
          } catch (e) {
            console.warn(`Could not decrypt the ${provider} key from the cloud:`, e);
          }
        })
      );
      callback({ keys, updatedAt });
    },
    onError
  );
}
