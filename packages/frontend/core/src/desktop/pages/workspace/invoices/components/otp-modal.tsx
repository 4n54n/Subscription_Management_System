import React from 'react';
import { createPortal } from 'react-dom';
import { cssVar } from '@toeverything/theme';
import { CloseIconSvg } from './icons';
import * as styles from '../../proposals/styles.css';

interface OtpModalProps {
  visible: boolean;
  purpose: 'DeleteInvoice' | 'EditInvoice' | 'ChangeInvoiceStatus';
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

export const OtpModal = ({
  visible,
  purpose,
  otpCode,
  setOtpCode,
  otpError,
  otpSending,
  onCancel,
  onConfirm,
}: OtpModalProps) => {
  if (!visible || typeof document === 'undefined') return null;

  const displayError = formatErrorMessage(otpError);

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000
    }}>
      <div style={{
        backgroundColor: cssVar('backgroundPrimaryColor'),
        border: `1px solid ${cssVar('borderColor')}`,
        color: cssVar('textPrimaryColor'),
        padding: '24px',
        borderRadius: '14px',
        width: '400px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: cssVar('textPrimaryColor'), margin: 0 }}>Security Authorization</h3>
          <button onClick={onCancel} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: cssVar('textSecondaryColor') }}>
            <CloseIconSvg />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), marginBottom: '16px', lineHeight: '1.5' }}>
          An authorization code has been dispatched to your registered email to authorize this restricted operation ({
            purpose === 'EditInvoice' 
              ? 'Modify Finalized Document' 
              : purpose === 'ChangeInvoiceStatus' 
                ? 'Change Invoice Status' 
                : 'Delete Invoice'
          }).
        </p>

        {otpSending ? (
          <p style={{ fontSize: '12px', color: '#2563eb' }}>Sending security code...</p>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter 6-digit OTP code"
              value={otpCode}
              maxLength={6}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: cssVar('backgroundSecondaryColor'),
                color: cssVar('textPrimaryColor'),
                border: `1px solid ${cssVar('borderColor')}`,
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '6px',
                textAlign: 'center',
                marginBottom: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {displayError && (
              <div style={{ fontSize: '12px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                {displayError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
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
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
