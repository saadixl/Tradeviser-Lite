import { useState } from 'react';
import {
  HiOutlineKey,
  HiCheckCircle,
  HiOutlineExternalLink,
  HiOutlineShieldCheck,
  HiOutlineCloudUpload,
  HiOutlineCloud,
  HiOutlineLogout,
} from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import { PROVIDERS, loadApiKey, loadAllApiKeys, saveApiKey, maskApiKey } from '../data/providers';
import {
  accountEnabled,
  useAccount,
  activeApiKey,
  signIn,
  signOut,
  setUseCloud,
  uploadLocalKeys,
  removeCloudKeys,
} from '../data/account';

const PROVIDER_NOTES = {
  massive: 'Full signal set, including analyst targets and news sentiment on plans that include them.',
  alphavantage: 'Free tier available. About 6 requests per analysis, so the daily limit goes quickly.',
};

const providerLabel = (value) => PROVIDERS.find((p) => p.value === value)?.label || value;

function formatWhen(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function authErrorMessage(e) {
  const code = e?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/popup-blocked') return 'The sign-in window was blocked. Allow pop-ups for this site and try again.';
  if (code === 'auth/unauthorized-domain') return 'Sign-in isn\'t enabled for this address yet.';
  return e?.message || 'Something went wrong.';
}

/** Sign-in, saving this browser's keys to the account, and the "Use keys from cloud" toggle. */
function AccountCard() {
  const account = useAccount();
  const { user, authReady, useCloud, cloud, cloudError } = account;
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const act = (name, fn, done) => async () => {
    setBusy(name);
    setStatus('');
    setError('');
    try {
      await fn();
      if (done) setStatus(done);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const localKeys = loadAllApiKeys();
  const hasLocalKeys = Object.values(localKeys).some(Boolean);
  const cloudProviders = Object.keys(cloud?.keys || {}).filter((p) => cloud.keys[p]);
  const lastUpdated = Math.max(0, ...Object.values(cloud?.updatedAt || {}).filter(Number.isFinite));

  return (
    <section className="card account-card" style={{ '--i': 0 }} aria-labelledby="account-title">
      <div className="key-card-head">
        <div>
          <h2 id="account-title" className="key-card-title">Tradeviser account</h2>
          <p className="key-card-note">
            Sign in with your Tradeviser account to keep your API keys in the cloud and use them on any device.
          </p>
        </div>
        {user ? (
          <span className="status status-ok"><HiCheckCircle aria-hidden="true" /> Signed in</span>
        ) : (
          <span className="status">{authReady ? 'Signed out' : 'Checking…'}</span>
        )}
      </div>

      {!user && authReady && (
        <div>
          <button type="button" className="btn btn-ghost btn-google" onClick={act('signin', signIn)} disabled={busy === 'signin'}>
            <FcGoogle aria-hidden="true" /> {busy === 'signin' ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>
      )}

      {user && (
        <>
          <div className="key-saved account-user">
            {user.photoURL ? (
              <img className="account-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="key-saved-icon account-avatar" aria-hidden="true">{(user.name || user.email || '?')[0]}</span>
            )}
            <span className="account-id">
              <span className="account-name">{user.name || user.email}</span>
              {user.name && user.email && <span className="account-email">{user.email}</span>}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={act('signout', signOut)} disabled={Boolean(busy)}>
              <HiOutlineLogout aria-hidden="true" /> Sign out
            </button>
          </div>

          <div className="cloud-row">
            <div className="cloud-row-text">
              <p className="cloud-row-title">Save keys to cloud</p>
              <p className="cloud-row-note">
                {cloud === null
                  ? 'Checking your account…'
                  : cloudProviders.length
                    ? `In your account: ${cloudProviders.map(providerLabel).join(', ')}${lastUpdated ? ` · updated ${formatWhen(lastUpdated)}` : ''}.`
                    : 'No keys in your account yet. Saving encrypts this browser\'s keys and stores them in your account.'}
              </p>
            </div>
            <div className="cloud-row-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={act('upload', uploadLocalKeys, 'Keys saved to your account')}
                disabled={!hasLocalKeys || Boolean(busy)}
                title={hasLocalKeys ? undefined : 'Add a key below first'}
              >
                <HiOutlineCloudUpload aria-hidden="true" /> {busy === 'upload' ? 'Saving…' : 'Save to cloud'}
              </button>
              {cloudProviders.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm is-danger"
                  onClick={act('delete', removeCloudKeys, 'Keys deleted from your account')}
                  disabled={Boolean(busy)}
                >
                  {busy === 'delete' ? 'Deleting…' : 'Delete from cloud'}
                </button>
              )}
            </div>
          </div>

          <label className="cloud-row cloud-toggle">
            <div className="cloud-row-text">
              <p className="cloud-row-title">Use keys from cloud</p>
              <p className="cloud-row-note">
                Analyses use the keys saved in your account. A provider with no key there uses this browser&apos;s key.
              </p>
            </div>
            <span className="switch">
              <input
                type="checkbox"
                role="switch"
                checked={useCloud}
                onChange={(e) => { setUseCloud(e.target.checked); setStatus(''); }}
              />
              <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
            </span>
          </label>
        </>
      )}

      {(status || error || cloudError) && (
        <div className="key-card-foot">
          {error || cloudError ? (
            <span className="key-status is-error" role="alert">{error || cloudError}</span>
          ) : (
            <span className="key-status" role="status">{status}</span>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One provider's API key. A saved key is only ever shown masked (last 4 characters);
 * the input is for adding or replacing it and is cleared once saved.
 */
function ApiKeyCard({ provider, i }) {
  const account = useAccount();
  const active = activeApiKey(provider.value, account);
  const fromCloud = active.source === 'cloud';
  const savedKey = loadApiKey(provider.value);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const inputId = `settings-key-${provider.value}`;
  const showForm = !fromCloud && (!savedKey || editing);

  const save = (e) => {
    e.preventDefault();
    const key = draft.trim();
    if (!key) return;
    saveApiKey(provider.value, key);
    setDraft('');
    setEditing(false);
    setStatus('Key saved');
  };

  const remove = () => {
    saveApiKey(provider.value, '');
    setDraft('');
    setEditing(false);
    setStatus('Key removed');
  };

  const shownKey = fromCloud ? active.key : savedKey;

  return (
    <section className="card key-card" style={{ '--i': i }} aria-labelledby={`${inputId}-title`}>
      <div className="key-card-head">
        <div>
          <h2 id={`${inputId}-title`} className="key-card-title">{provider.label}</h2>
          <p className="key-card-note">{PROVIDER_NOTES[provider.value]}</p>
        </div>
        {fromCloud ? (
          <span className="status status-ok">
            <HiOutlineCloud aria-hidden="true" /> From cloud
          </span>
        ) : savedKey ? (
          <span className="status status-ok">
            <HiCheckCircle aria-hidden="true" /> Connected
          </span>
        ) : (
          <span className="status">Not connected</span>
        )}
      </div>

      {shownKey && (
        <div className="key-saved">
          <span className="key-saved-icon" aria-hidden="true">{fromCloud ? <HiOutlineCloud /> : <HiOutlineKey />}</span>
          <span className="key-saved-mask mono" aria-label={`Saved key ending in ${shownKey.slice(-4)}`}>
            {maskApiKey(shownKey)}
          </span>
          {!fromCloud && (
            <span className="key-saved-actions">
              {!editing && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(true); setStatus(''); }}>
                  Replace
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm is-danger" onClick={remove}>
                Remove
              </button>
            </span>
          )}
        </div>
      )}

      {fromCloud && (
        <p className="key-card-note">
          This key comes from your account. Turn off &ldquo;Use keys from cloud&rdquo; to use or change this browser&apos;s key.
        </p>
      )}

      {showForm && (
        <form className="key-form" onSubmit={save}>
          <label className="field-label" htmlFor={inputId}>
            {savedKey ? 'New key' : 'API key'}
          </label>
          <div className="key-form-row">
            <div className="input-wrap">
              <HiOutlineKey className="input-icon" aria-hidden="true" />
              <input
                id={inputId}
                type="password"
                className="input mono"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setStatus(''); }}
                placeholder={`Paste your ${provider.label} key`}
                autoComplete="off"
                spellCheck="false"
                autoFocus={editing}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
              Save key
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setDraft(''); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="key-card-foot">
        {status ? <span className="key-status" role="status">{status}</span> : <span />}
        <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="link">
          Get a key from {provider.label} <HiOutlineExternalLink aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function Settings() {
  return (
    <div className="page settings">
      <header className="hero hero-compact">
        <p className="eyebrow eyebrow-accent">Settings</p>
        <h1 className="hero-title">Data providers</h1>
        <p className="hero-lead">
          Connect at least one provider to run analyses. You can switch between them on the Analyze page.
        </p>
      </header>

      {accountEnabled && <AccountCard />}

      <div className="key-cards">
        {PROVIDERS.map((p, i) => (
          <ApiKeyCard key={p.value} provider={p} i={i + 1} />
        ))}
      </div>

      <div className="privacy-note" style={{ '--i': 3 }}>
        <HiOutlineShieldCheck aria-hidden="true" />
        <p>
          Keys are stored in this browser and sent only to their provider. If you save them to the cloud, they&apos;re
          encrypted in this browser first and only your signed-in account can read them. Saved keys are never shown in full.
        </p>
      </div>
    </div>
  );
}

export default Settings;
