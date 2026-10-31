import React from 'react';
import { createPortal } from 'react-dom';
import { cssVar } from '@toeverything/theme';
import * as styles from '../../proposals/styles.css';
import { CloseIconSvg } from './icons';

interface OtpModalProps {
  visible: boolean;
  purpose: string;
  actionTitle: string;
  otpCode: string;
  setOtpCode: (val: string) => void;
  otpError: string;
  otpSending: boolean;
  onCancel: () => void;
  onConfirm: (code: string) => void;
}

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

export const OtpModal: React.FC<OtpModalProps> = ({
  visible,
  actionTitle,
  otpCode,
  setOtpCode,
  otpError,
  otpSending,
  onCancel,
  onConfirm,
}) => {
  if (!visible || typeof document === 'undefined') return null;

  const displayError = formatErrorMessage(otpError);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2147483647,
      }}
    >
      <div
        style={{
          backgroundColor: cssVar('backgroundPrimaryColor'),
          border: `1px solid ${cssVar('borderColor')}`,
          color: cssVar('textPrimaryColor'),
          padding: '24px',
          borderRadius: '12px',
          width: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: cssVar('textPrimaryColor'), margin: 0 }}>
            Security Authorization
          </h3>
          <button
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: cssVar('textSecondaryColor'),
            }}
          >
            <CloseIconSvg />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), marginBottom: '16px', lineHeight: '1.5' }}>
          {actionTitle ? `${actionTitle}. ` : ''}
          An authorization code has been dispatched to your corporate email to authorize this operation.
        </p>

        {otpSending ? (
          <p style={{ fontSize: '12px', color: '#2563eb' }}>Sending security code...</p>
        ) : (
          <div>
            <input
              type="text"
              placeholder="000000"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '20px',
                letterSpacing: '8px',
                textAlign: 'center',
                border: `1px solid ${displayError ? '#ef4444' : cssVar('borderColor')}`,
                borderRadius: '8px',
                marginBottom: '12px',
                outline: 'none',
                backgroundColor: cssVar('backgroundSecondaryColor'),
                color: cssVar('textPrimaryColor'),
                boxSizing: 'border-box',
                fontFamily: 'monospace',
              }}
            />

            {displayError && (
              <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>
                {displayError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => onConfirm(otpCode)}
                disabled={otpCode.length !== 6}
              >
                Authorize Action
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
