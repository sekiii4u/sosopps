import { useState } from 'react';
import { Check, Copy, Dice5, KeyRound, Sparkles, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { provisionClient } from '../lib/auth';
import './ClientProvisionModal.css';

const firstNames = [
  'Amber',
  'Cedar',
  'Velvet',
  'Silver',
  'Marlow',
  'Juniper',
  'Golden',
  'Harbor',
  'Sunday',
  'Blue',
];
const secondNames = [
  'House',
  'Studio',
  'Collective',
  'Market',
  'Supply',
  'Works',
  'Society',
  'Corner',
  'Garden',
  'Foundry',
];
const pick = (items: string[]) =>
  items[crypto.getRandomValues(new Uint32Array(1))[0] % items.length];
const randomName = () => `${pick(firstNames)} ${pick(secondNames)}`;
const randomUsername = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15)}${(crypto.getRandomValues(new Uint32Array(1))[0] % 900) + 100}`;
const randomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return `So!${Array.from(bytes, (value) => value.toString(36).padStart(2, '0')).join('')}9`;
};

export default function ClientProvisionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState(randomName);
  const [username, setUsername] = useState(() => randomUsername(name));
  const [password, setPassword] = useState(randomPassword);
  const [dailyTarget, setDailyTarget] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{
    name: string;
    username: string;
    password: string;
  } | null>(null);
  const rollName = () => {
    const next = randomName();
    setName(next);
    setUsername(randomUsername(next));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await provisionClient(
        name,
        username || randomUsername(name),
        password,
        dailyTarget
      );
      const issued = { name: result.name, username: result.username, password };
      setCredentials(issued);
      onCreated();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create client access.');
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Client: ${credentials.name}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`
    );
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section className="modal client-provision-modal">
        <div className="modal-heading">
          <div>
            <div className="modal-icon">
              <KeyRound size={18} />
            </div>
            <h2>{credentials ? 'Client access created' : 'Create client access'}</h2>
            <p>
              {credentials
                ? 'Copy these credentials and share them with the client.'
                : 'Generate a client identity and a private login.'}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {credentials ? (
          <div className="issued-credentials">
            <div className="issued-warning">
              <Sparkles size={16} />
              <span>This password is shown once. Save it now; it cannot be viewed again.</span>
            </div>
            <div className="credential-value">
              <small>CLIENT NAME</small>
              <strong>{credentials.name}</strong>
            </div>
            <div className="credential-value">
              <small>USERNAME</small>
              <strong>{credentials.username}</strong>
            </div>
            <div className="credential-value">
              <small>TEMPORARY PASSWORD</small>
              <strong className="credential-password">{credentials.password}</strong>
            </div>
            <div className="modal-footer">
              <span>Client access: posting log only</span>
              <div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => void copy()}
                >
                  <Copy size={14} /> Copy details
                </button>
                <button type="button" className="button button-primary" onClick={onClose}>
                  <Check size={15} /> Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="form-grid">
                <label className="form-field field-wide">
                  <span>Client name used throughout the workspace</span>
                  <div className="name-generate">
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                    <button className="button button-secondary" type="button" onClick={rollName}>
                      <Dice5 size={15} /> Randomize
                    </button>
                  </div>
                </label>
                <label className="form-field">
                  <span>Username to share</span>
                  <input
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
                    autoComplete="off"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Auto-generated if blank"
                  />
                </label>
                <label className="form-field">
                  <span>Daily video target</span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="10000"
                    value={dailyTarget}
                    onChange={(event) => setDailyTarget(Number(event.target.value))}
                  />
                </label>
                <label className="form-field field-wide">
                  <span>One-time password to share</span>
                  <input
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              </div>
              {error && (
                <p className="provision-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <span>Client can view only their own workspace and edit posts.</span>
              <div>
                <button type="button" className="button button-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={busy}>
                  {busy ? 'Creating…' : 'Create login'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
