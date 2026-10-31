import React from 'react';
import { createPortal } from 'react-dom';
import * as styles from '../styles.css';

interface BumpModalProps {
  visible: boolean;
  newVer: string;
  description: string;
  onDescriptionChange: (val: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const BumpModal = ({
  visible,
  newVer,
  description,
  onDescriptionChange,
  onCancel,
  onConfirm,
}: BumpModalProps) => {
  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000
    }}>
      <div style={{
        width: '450px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#18181b', margin: 0 }}>
            Bump Document Version
          </h3>
          <p style={{ fontSize: '13px', color: '#71717a', marginTop: '6px', lineHeight: '1.5' }}>
            You are about to create version <strong>{newVer}</strong> of the document.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Change Description</label>
          <textarea
            rows={3}
            placeholder="Describe the modifications made in this version..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            style={{
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button
            className={styles.btn}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
