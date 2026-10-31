import React from 'react';
import { cssVar } from '@toeverything/theme';

export const formatErrorMessage = (error: any): string => {
  if (!error) return '';
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.data?.message) return formatErrorMessage(parsed.data.message);
        if (parsed.message) {
          const match = parsed.message.match(/message:\s*(.+)$/i);
          if (match && match[1]) return match[1].trim();
          return parsed.message;
        }
        if (parsed.error) return typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
      } catch {}
    }
    const match = trimmed.match(/message:\s*(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return trimmed;
  }
  if (typeof error === 'object') {
    if (error.data?.message) return formatErrorMessage(error.data.message);
    if (error.message) {
      const match = String(error.message).match(/message:\s*(.+)$/i);
      if (match && match[1]) return match[1].trim();
      return String(error.message);
    }
  }
  return String(error);
};

interface LockScreenProps {
  otpSent: boolean;
  emailForOtp: string;
  setEmailForOtp: (val: string) => void;
  otpCode: string;
  setOtpCode: (val: string) => void;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  otpError: string;
  setOtpSent: (val: boolean) => void;
  setOtpError: (val: string) => void;
  handleRequestOtp: (e: React.FormEvent) => void;
  handleVerifyOtp: (e: React.FormEvent) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  otpSent,
  emailForOtp,
  setEmailForOtp,
  otpCode,
  setOtpCode,
  isSendingOtp,
  isVerifyingOtp,
  otpError,
  setOtpSent,
  setOtpError,
  handleRequestOtp,
  handleVerifyOtp,
}) => {
  const displayError = formatErrorMessage(otpError);
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: cssVar('fontFamily'),
      color: '#ffffff',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        borderRadius: '24px',
        background: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(15, 98, 254, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '24px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #0f62fe 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(15, 98, 254, 0.3)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #e0f2fe, #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Guest Verification
          </h2>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
            {!otpSent
              ? 'Enter your authorized email to receive a verification code.'
              : `We sent a 6-digit verification code to ${emailForOtp}.`}
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="name@example.com"
                disabled={isSendingOtp}
                value={emailForOtp}
                onChange={(e) => setEmailForOtp(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#0f62fe'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>

            {displayError && (
              <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingOtp}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0f62fe 0%, #3b82f6 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 20px rgba(15, 98, 254, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSendingOtp ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255, 255, 255, 0.25)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <span>Sending Code...</span>
                </>
              ) : (
                <span>Send Verification Code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                placeholder="Enter 6-digit OTP code"
                disabled={isVerifyingOtp}
                value={otpCode}
                maxLength={6}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  letterSpacing: '4px',
                  outline: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#0f62fe'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>

            {displayError && (
              <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>
                {displayError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtpError(''); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isVerifyingOtp}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0f62fe 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(15, 98, 254, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isVerifyingOtp ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255, 255, 255, 0.25)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify & Access</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
