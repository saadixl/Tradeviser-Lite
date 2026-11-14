import { useState } from 'react';
import { HiOutlineKey, HiCheckCircle, HiOutlineExternalLink, HiOutlineShieldCheck } from 'react-icons/hi';
import { PROVIDERS, loadApiKey, saveApiKey, maskApiKey } from '../data/providers';

const PROVIDER_NOTES = {
  massive: 'Full signal set, including analyst targets and news sentiment on plans that include them.',
  alphavantage: 'Free tier available. About 6 requests per analysis, so the daily limit goes quickly.',
};

/**
 * One provider's API key. A saved key is only ever shown masked (last 4 characters);
 * the input is for adding or replacing it and is cleared once saved.
 */
function ApiKeyCard({ provider, i }) {
  const [savedKey, setSavedKey] = useState(() => loadApiKey(provider.value));
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const inputId = `settings-key-${provider.value}`;
  const showForm = !savedKey || editing;

  const save = (e) => {
    e.preventDefault();
    const key = draft.trim();
    if (!key) return;
    saveApiKey(provider.value, key);
    setSavedKey(key);
    setDraft('');
    setEditing(false);
    setStatus('Key saved');
  };

  const remove = () => {
    saveApiKey(provider.value, '');
    setSavedKey('');
    setDraft('');
    setEditing(false);
    setStatus('Key removed');
  };

  return (
    <section className="card key-card" style={{ '--i': i }} aria-labelledby={`${inputId}-title`}>
      <div className="key-card-head">
        <div>
          <h2 id={`${inputId}-title`} className="key-card-title">{provider.label}</h2>
          <p className="key-card-note">{PROVIDER_NOTES[provider.value]}</p>
        </div>
        {savedKey ? (
          <span className="status status-ok">
            <HiCheckCircle aria-hidden="true" /> Connected
          </span>
        ) : (
          <span className="status">Not connected</span>
        )}
      </div>

      {savedKey && (
        <div className="key-saved">
          <span className="key-saved-icon" aria-hidden="true"><HiOutlineKey /></span>
          <span className="key-saved-mask mono" aria-label={`Saved key ending in ${savedKey.slice(-4)}`}>
            {maskApiKey(savedKey)}
          </span>
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
        </div>
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

      <div className="key-cards">
        {PROVIDERS.map((p, i) => (
          <ApiKeyCard key={p.value} provider={p} i={i} />
        ))}
      </div>

      <div className="privacy-note" style={{ '--i': 2 }}>
        <HiOutlineShieldCheck aria-hidden="true" />
        <p>
          Keys are stored only in this browser and sent only to their provider. Tradeviser Lite has no server,
          and saved keys are never shown in full.
        </p>
      </div>
    </div>
  );
}

export default Settings;
