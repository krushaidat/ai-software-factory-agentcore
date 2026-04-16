import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { C } from '../config/colors';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, loading, error, needsNewPassword, completeNewPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const usernameRef = useRef<HTMLInputElement>(null);
  const newPwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (needsNewPassword) {
      newPwRef.current?.focus();
    } else {
      usernameRef.current?.focus();
    }
  }, [needsNewPassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || loading) return;
    setLocalError('');
    try {
      await login(username, password);
    } catch {
      // error is set in context
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || loading) return;
    setLocalError('');
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    try {
      await completeNewPassword(newPassword);
    } catch {
      // error is set in context
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: "'Outfit', sans-serif",
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  const displayError = localError || error;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '48px 40px 40px',
          width: 400,
          maxWidth: '90vw',
          boxSizing: 'border-box',
        }}
      >
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: C.accent, display: 'inline-block', flexShrink: 0,
            }}
          />
          <span style={{ color: C.muted, fontSize: 12 }}>Storm Reply × AWS</span>
        </div>

        <h1
          style={{
            color: C.text, fontSize: 26, fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            margin: '0 0 32px 0', letterSpacing: '-0.02em',
          }}
        >
          AI Software Factory
        </h1>

        {needsNewPassword ? (
          /* New password form (first login with temp password) */
          <form onSubmit={handleNewPassword}>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 8, fontSize: 13, color: C.accent }}>
              Please set a new password to continue.
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="new-password" style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>
                New Password
              </label>
              <input
                ref={newPwRef}
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="confirm-password" style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              style={{
                width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                background: loading || !newPassword ? C.dim : C.accent,
                color: loading || !newPassword ? C.muted : '#fff',
                border: 'none', borderRadius: 8,
                cursor: loading || !newPassword ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading && <Spinner />}
              {loading ? 'Setting password...' : 'Set password & sign in'}
            </button>

            {displayError && <ErrorBanner message={displayError} />}
          </form>
        ) : (
          /* Normal login form */
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="login-username" style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>
                Email
              </label>
              <input
                ref={usernameRef}
                id="login-username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your email"
                autoComplete="username"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="login-password" style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                background: loading || !username || !password ? C.dim : C.accent,
                color: loading || !username || !password ? C.muted : '#fff',
                border: 'none', borderRadius: 8,
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading && <Spinner />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            {displayError && <ErrorBanner message={displayError} />}
          </form>
        )}
      </motion.div>

      <span style={{ marginTop: 24, fontSize: 11, color: C.dim }}>
        Powered by Amazon Bedrock · Amazon Cognito
      </span>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      display: 'inline-block', animation: 'spin 0.6s linear infinite',
    }} />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      marginTop: 16, padding: '10px 14px',
      background: C.critDim, border: `1px solid ${C.crit}`,
      borderRadius: 8, color: C.crit, fontSize: 13,
    }}>
      {message}
    </div>
  );
}
