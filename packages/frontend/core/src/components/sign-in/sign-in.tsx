import { notify } from '@affine/component';
import { AuthService } from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { useLiveData, useService } from '@toeverything/infra';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { SignInState } from '.';
import oneLogoLight from '../../assets/one-logo-light.png';
import illustrationLight from '../../assets/other-page.light.png';
import { useCompanyProfile } from '../hooks/use-company-profile';

export const SignInStep = ({
  state,
  onAuthenticated,
}: {
  state: SignInState;
  changeState: Dispatch<SetStateAction<SignInState>>;
  onAuthenticated?: (status: AuthSessionStatus) => void;
}) => {
  const authService = useService(AuthService);
  const loginStatus = useLiveData(authService.session.status$);
  const companyProfile = useCompanyProfile();
  const prevStatusRef = useRef<string | null>(null);

  // Form states
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (
      loginStatus === 'authenticated' &&
      prevStatusRef.current !== null &&
      prevStatusRef.current !== 'authenticated'
    ) {
      onAuthenticated?.(loginStatus);
    }
    prevStatusRef.current = loginStatus;
  }, [loginStatus, onAuthenticated]);

  // Password validation rules
  const hasLength = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasSpecial;

  // Sign In handler
  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);

    try {
      await authService.signInPassword({ email: email.trim(), password });
      notify.success({
        title: 'Sign In Successful',
        message: 'Welcome back to Brightloop Software!',
      });
      // Redirect to target or workspace root
      const target = state.redirectUrl || '/';
      window.location.href = target;
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password. Please verify your credentials.';
      setErrorMessage(msg);
      notify.error({ title: 'Sign In Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  // Customer Registration handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter your company or full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Password does not satisfy all security criteria.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Customer registration failed.');
      }

      notify.success({
        title: 'Registration Successful',
        message: 'Account created! Signing you in...',
      });

      // Auto sign-in with newly created credentials
      await authService.signInPassword({ email: email.trim(), password });
      window.location.href = state.redirectUrl || '/';
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      notify.error({ title: 'Registration Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);

    try {
      // Send reset instructions (simulated for local hackathon demo environment)
      setSuccessMessage(`Password reset link sent to ${email.trim()}. Please check your inbox.`);
      notify.success({
        title: 'Reset Link Sent',
        message: `A reset link has been dispatched to ${email.trim()}.`,
      });
    } catch (err: any) {
      setErrorMessage('Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Credentials quick fill
  const fillCredentials = (role: 'admin' | 'staff' | 'customer') => {
    setMode('login');
    setErrorMessage(null);
    if (role === 'admin') {
      setEmail('admin@brightloop.local');
      setPassword('Admin@Brightloop2026!');
    } else if (role === 'staff') {
      setEmail('staff@brightloop.local');
      setPassword('Staff@Brightloop2026!');
    } else {
      setEmail('customer@brightloop.local');
      setPassword('Customer@Brightloop2026!');
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        background: '#ffffff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
      }}
    >
      {/* LEFT COLUMN: Form & Branding */}
      <div
        style={{
          padding: '40px 52px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100vh',
          boxSizing: 'border-box',
          maxWidth: '560px',
        }}
      >
        {/* Top Left Logo / Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/brightloop-icon.png"
            alt="Brightloop"
            style={{
              width: '44px',
              height: '44px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 10px rgba(5, 101, 255, 0.3))',
            }}
          />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Brightloop Software
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Subscription & Recurring Billing ERP
            </div>
          </div>
        </div>

        {/* Center Auth Form */}
        <div style={{ width: '100%', margin: '32px 0' }}>
          {/* Header Title */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 8px 0',
              letterSpacing: '-0.8px',
              lineHeight: 1.2,
            }}
          >
            {mode === 'login' && 'Sign in to Brightloop'}
            {mode === 'register' && 'Register as Customer'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            {mode === 'login' && 'Manage subscription lifecycles, recurring invoicing, and payments.'}
            {mode === 'register' && 'Create your customer account to access your subscriptions and invoices.'}
            {mode === 'forgot' && 'Enter your email to receive a password reset link.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                background: mode === 'login' ? '#ffffff' : 'transparent',
                color: mode === 'login' ? '#0f172a' : '#64748b',
                boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                background: mode === 'register' ? '#ffffff' : 'transparent',
                color: mode === 'register' ? '#0f172a' : '#64748b',
                boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Register Customer
            </button>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@brightloop.local"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#0565ff')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#cbd5e1')}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0565ff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      fontSize: '14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#0565ff')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0565ff',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: '8px',
                  transition: 'background 0.15s ease',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In to Workspace'}
              </button>

              {/* Quick Demo Fill Buttons for Hackathon Presentation */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Demo Logins:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin')}
                    style={{
                      padding: '7px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0565ff',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('staff')}
                    style={{
                      padding: '7px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0891b2',
                      background: '#ecfeff',
                      border: '1px solid #a5f3fc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('customer')}
                    style={{
                      padding: '7px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#059669',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Customer
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* CUSTOMER REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company or Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Acme Global Inc."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Email Address (must be unique)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="client@acmecorp.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      fontSize: '14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Password Policy Checklist (Specification requirement 1) */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', marginTop: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                    Password Security Requirements:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                    <div style={{ color: hasLength ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{hasLength ? '✓' : '○'}</span> More than 8 characters
                    </div>
                    <div style={{ color: hasUpper ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{hasUpper ? '✓' : '○'}</span> Uppercase letter
                    </div>
                    <div style={{ color: hasLower ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{hasLower ? '✓' : '○'}</span> Lowercase letter
                    </div>
                    <div style={{ color: hasSpecial ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{hasSpecial ? '✓' : '○'}</span> Special character
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: isPasswordValid ? '#0565ff' : '#94a3b8',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isPasswordValid && !loading ? 'pointer' : 'not-allowed',
                  marginTop: '8px',
                }}
              >
                {loading ? 'Creating Account...' : 'Complete Customer Registration'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0565ff',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Sending link...' : 'Send Password Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '12px',
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '20px',
          }}
        >
          <span>
            © {currentYear} Brightloop Software. All rights reserved.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#0565ff', fontWeight: 500 }}>Terms</span>
            <span>|</span>
            <span style={{ color: '#0565ff', fontWeight: 500 }}>Privacy</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Illustration & Hero Card */}
      <div
        style={{
          background: '#f6f8fd',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          boxSizing: 'border-box',
          borderLeft: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '20px 0',
          }}
        >
          <img
            src={illustrationLight}
            alt="Brightloop Subscription Management System"
            style={{
              width: '92%',
              maxWidth: '640px',
              maxHeight: '520px',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.05))',
            }}
          />
        </div>

        {/* Workspace Tagline Info Section */}
        <div
          style={{
            width: '100%',
            maxWidth: '580px',
            textAlign: 'center',
            marginTop: 'auto',
            paddingBottom: '16px',
          }}
        >
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 10px 0',
              letterSpacing: '-0.5px',
              lineHeight: 1.3,
            }}
          >
            Unified <strong>Subscription Management</strong> & Recurring Billing
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
            Automated recurring invoices, flexible frequency plans, dynamic product variants, discount management, and real-time revenue analytics for Brightloop Software.
          </p>
        </div>
      </div>
    </div>
  );
};
