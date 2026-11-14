import { useState } from 'react';
import { HiOutlineCog, HiOutlineKey, HiOutlineCheckCircle } from 'react-icons/hi';
import { PROVIDERS, loadApiKey, saveApiKey, maskApiKey } from '../data/providers';

/**
 * One provider's API key. A saved key is only ever shown masked (last 4 characters);
 * the input is for adding or replacing it and is cleared once saved.
 */
function ApiKeyCard({ provider }) {
  const [savedKey, setSavedKey] = useState(() => loadApiKey(provider.value));
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const inputId = `settings-key-${provider.value}`;

  const save = (e) => {
    e.preventDefault();
    const key = draft.trim();
    if (!key) return;
    saveApiKey(provider.value, key);
    setSavedKey(key);
    setDraft('');
    setStatus('Saved');
  };

  const remove = () => {
    saveApiKey(provider.value, '');
    setSavedKey('');
    setDraft('');
    setStatus('Removed');
  };

  return (
    <section className="playground-panel settings-card" aria-labelledby={`${inputId}-title`}>
      <div className="settings-card-head">
        <h2 id={`${inputId}-title`} className="playground-panel-title">
          {provider.label} API key
        </h2>
        {savedKey ? (
          <span className="settings-key-saved">
            <HiOutlineCheckCircle aria-hidden />
            <span className="settings-key-mask" aria-label={`Saved key ending in ${savedKey.slice(-4)}`}>
              {maskApiKey(savedKey)}
            </span>
          </span>
        ) : (
          <span className="settings-key-missing">No key saved</span>
        )}
      </div>

      <form className="settings-key-form" onSubmit={save}>
        <label className="playground-field-label" htmlFor={inputId}>
          {savedKey ? 'Replace key' : 'Add key'}
        </label>
        <div className="settings-key-row">
          <div className="playground-combo">
            <HiOutlineKey className="playground-combo-icon" aria-hidden />
            <input
              id={inputId}
              type="password"
              className="playground-combo-input"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setStatus('');
              }}
              placeholder={`Paste your ${provider.label} API key`}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
            Save
          </button>
          {savedKey && (
            <button type="button" className="btn btn-outline" onClick={remove}>
              Remove
            </button>
          )}
        </div>
        <p className="playground-field-hint">
          {status && <span className="settings-status" role="status">{status}. </span>}
          <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer">
            Get a key from {provider.label}
          </a>
        </p>
      </form>
    </section>
  );
}

function Settings() {
  return (
    <div className="analysis-page-wrap">
      <div className="analysis-page playground-page">
        <header className="analysis-header playground-header">
          <div className="playground-title-row">
            <h1 className="analysis-title">
              <HiOutlineCog className="analysis-header-icon" aria-hidden />
              Settings
            </h1>
            <p className="playground-lead">
              API keys are saved only in this browser and sent only to their provider.
            </p>
          </div>
        </header>

        {PROVIDERS.map((p) => (
          <ApiKeyCard key={p.value} provider={p} />
        ))}
      </div>
    </div>
  );
}

export default Settings;
