import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIconSvg } from './icons';
import * as styles from '../../proposals/styles.css';

interface DocModalData {
  visible: boolean;
  mode: 'create' | 'edit';
  letterhead?: any | null;
  subject: string;
  recipientTitle: string;
  recipientName: string;
  addressLine1: string;
  addressLine2: string;
}

interface LetterheadModalProps {
  docModal: DocModalData;
  setDocModal: React.Dispatch<React.SetStateAction<DocModalData>>;
  onSubmit: () => void;
}

export const LetterheadModal = ({
  docModal,
  setDocModal,
  onSubmit,
}: LetterheadModalProps) => {
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
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            {docModal.mode === 'create' ? 'Create New Letterhead' : 'Edit Letterhead Details'}
          </h3>
          <button onClick={() => setDocModal(prev => ({ ...prev, visible: false }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <CloseIconSvg />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Subject</label>
            <input
              type="text"
              placeholder="e.g. Strategic Partnership & Enterprise AI Development"
              value={docModal.subject}
              onChange={e => setDocModal(prev => ({ ...prev, subject: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Recipient Title</label>
            <input
              type="text"
              placeholder="e.g. To Whom It May Concern"
              value={docModal.recipientTitle}
              onChange={e => setDocModal(prev => ({ ...prev, recipientTitle: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Recipient Name</label>
            <input
              type="text"
              placeholder="e.g. Apex Global Logistics Inc."
              value={docModal.recipientName}
              onChange={e => setDocModal(prev => ({ ...prev, recipientName: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Address Line 1</label>
            <input
              type="text"
              placeholder="e.g. No.100 Pine Street, Suite 2400"
              value={docModal.addressLine1}
              onChange={e => setDocModal(prev => ({ ...prev, addressLine1: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Address Line 2</label>
            <input
              type="text"
              placeholder="e.g. San Francisco, CA 94111"
              value={docModal.addressLine2}
              onChange={e => setDocModal(prev => ({ ...prev, addressLine2: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
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
