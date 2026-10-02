import { useState } from 'react';
import { Activity, ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import type { UserRole } from '../lib/auth';
import { bootstrapAdmin, signInWithUsername } from '../lib/auth';
import { supabaseConfigured } from '../lib/supabase';
import './AuthScreen.css';

type Props = { onAuthenticated: () => void };
type View = 'login' | 'bootstrap';

export default function AuthScreen({ onAuthenticated }: Props) {
  const [role, setRole] = useState<UserRole>('admin');
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (view === 'bootstrap') await bootstrapAdmin(setupSecret, username, password);
      else await signInWithUsername(username, password, role);
      onAuthenticated();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">
            <Activity size={20} />
          </span>
          <span>
            social<span>ops</span>
            <small>CONTROL CENTER</small>
          </span>
        </div>
        <div className="auth-heading">
          <div className="auth-eyebrow">
            {view === 'bootstrap' ? 'FIRST-TIME SETUP' : 'WORKSPACE ACCESS'}
          </div>
          <h1>{view === 'bootstrap' ? 'Create your admin' : 'Welcome back'}</h1>
          <p>
            {view === 'bootstrap'
              ? 'Set up the owner account for this Social Ops workspace.'
              : 'Choose your access type to continue to your workspace.'}
          </p>
        </div>
        {view === 'login' && (
          <div className="auth-role-switch" role="tablist" aria-label="Account type">
            <button
              type="button"
              role="tab"
              aria-selected={role === 'admin'}
              className={role === 'admin' ? 'selected' : ''}
              onClick={() => {
                setRole('admin');
                setError('');
              }}
            >
              <ShieldCheck size={16} /> Admin
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'client'}
              className={role === 'client' ? 'selected' : ''}
              onClick={() => {
                setRole('client');
                setError('');
              }}
            >
              <Users size={16} /> Client
            </button>
          </div>
        )}
        <form className="auth-form" onSubmit={submit}>
          {view === 'bootstrap' && (
            <label>
              <span>One-time setup secret</span>
              <input
                required
                type="password"
                autoComplete="off"
                value={setupSecret}
                onChange={(event) => setSetupSecret(event.target.value)}
                placeholder="From your Supabase server secret"
              />
            </label>
          )}
          <label>
            <span>{view === 'bootstrap' ? 'Admin username' : 'Username'}</span>
            <input
              required
              autoFocus
              autoComplete="username"
              minLength={3}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={role === 'admin' ? 'Your admin username' : 'Username provided by admin'}
            />
          </label>
          <label>
            <span>{view === 'bootstrap' ? 'Admin password' : 'Password'}</span>
            <div className="auth-password">
              <input
                required
                autoComplete={view === 'bootstrap' ? 'new-password' : 'current-password'}
                minLength={view === 'bootstrap' ? 12 : 1}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  view === 'bootstrap' ? 'At least 12 characters' : 'Enter your password'
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          {!supabaseConfigured && (
            <div className="auth-warning">
              Add your Supabase project URL and publishable key to <strong>.env.local</strong>, then
              restart the app.
            </div>
          )}
          <button type="submit" disabled={busy || !supabaseConfigured} className="auth-submit">
            {busy ? 'Please wait…' : view === 'bootstrap' ? 'Set up admin' : `Continue as ${role}`}{' '}
            <ArrowRight size={16} />
          </button>
        </form>
        {view === 'login' ? (
          <button
            className="auth-secondary"
            type="button"
            onClick={() => {
              setView('bootstrap');
              setRole('admin');
              setError('');
            }}
          >
            <KeyRound size={14} /> First time here? Set up the admin
          </button>
        ) : (
          <button
            className="auth-secondary"
            type="button"
            onClick={() => {
              setView('login');
              setError('');
            }}
          >
            Back to login
          </button>
        )}
        <div className="auth-foot">
          <span className="auth-secure-dot" /> Secure workspace access <span>·</span> No public
          registration
        </div>
      </section>
      <div className="auth-caption">A clearer view of every channel, every client, every post.</div>
    </main>
  );
}
