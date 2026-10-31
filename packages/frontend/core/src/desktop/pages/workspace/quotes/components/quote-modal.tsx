import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIconSvg } from './icons';
import { CurrencyDropdown } from '../../documents-shared/currency-dropdown';
import * as styles from '../../proposals/styles.css';

interface DocModalData {
  visible: boolean;
  mode: 'create' | 'edit';
  quote?: any | null;
  shortTitle: string;
  companyName: string;
  lead: string;
  email: string;
  phone: string;
  currency: string;
}

interface QuoteModalProps {
  docModal: DocModalData;
  setDocModal: React.Dispatch<React.SetStateAction<DocModalData>>;
  onSubmit: () => void;
}

export const QuoteModal = ({
  docModal,
  setDocModal,
  onSubmit,
}: QuoteModalProps) => {
  if (!docModal.visible || typeof document === 'undefined') return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000
    }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
            {docModal.mode === 'create' ? 'Create New Quote' : 'Edit Quote Details'}
          </h3>
          <button onClick={() => setDocModal(prev => ({ ...prev, visible: false }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <CloseIconSvg />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Short Title</label>
            <input
              type="text"
              placeholder="e.g. AI PM QUOTE"
              value={docModal.shortTitle}
              onChange={e => setDocModal(prev => ({ ...prev, shortTitle: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Company Name</label>
            <input
              type="text"
              placeholder="e.g. Example Company Inc."
              value={docModal.companyName}
              onChange={e => setDocModal(prev => ({ ...prev, companyName: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Contact (Lead)</label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins · Chief Information Officer"
              value={docModal.lead}
              onChange={e => setDocModal(prev => ({ ...prev, lead: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Email</label>
              <input
                type="text"
                placeholder="e.g. sarah.jenkins@example.com"
                value={docModal.email}
                onChange={e => setDocModal(prev => ({ ...prev, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Client Phone</label>
              <input
                type="text"
                placeholder="e.g. +1 (555) 902-3481"
                value={docModal.phone}
                onChange={e => setDocModal(prev => ({ ...prev, phone: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Currency Symbol</label>
            <CurrencyDropdown
              value={docModal.currency}
              onChange={val => setDocModal(prev => ({ ...prev, currency: val }))}
            />
          </div>
        </div>

        <button
          className={styles.btnPrimary}
          style={{ width: '100%', padding: '10px', fontWeight: 600 }}
          onClick={onSubmit}
        >
          {docModal.mode === 'create' ? 'Create Document' : 'Save Properties'}
        </button>
      </div>
    </div>,
    document.body
  );
};
