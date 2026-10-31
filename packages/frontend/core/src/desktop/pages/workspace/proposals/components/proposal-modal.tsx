import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIconSvg } from './icons';
import * as styles from '../styles.css';

interface DocModalData {
  visible: boolean;
  mode: 'create' | 'edit';
  proposal?: any | null;
  shortTitle: string;
  proposalTag: string;
  title: string;
  titlePlatform: string;
  duration: string;
  subtitle: string;
  tagline: string;
  companyName: string;
  distributionList: string;
  researchValidation: string;
}

interface ProposalModalProps {
  docModal: DocModalData;
  setDocModal: React.Dispatch<React.SetStateAction<DocModalData>>;
  onSubmit: () => void;
}

export const ProposalModal = ({
  docModal,
  setDocModal,
  onSubmit,
}: ProposalModalProps) => {
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
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
            {docModal.mode === 'create' ? 'Create New Proposal' : 'Edit Proposal Details'}
          </h3>
          <button onClick={() => setDocModal(prev => ({ ...prev, visible: false }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <CloseIconSvg />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Short Title</label>
              <input
                type="text"
                placeholder="e.g. AI AGENT PM PROPOSAL"
                value={docModal.shortTitle}
                onChange={e => setDocModal(prev => ({ ...prev, shortTitle: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Proposal Tag</label>
              <input
                type="text"
                placeholder="e.g. Technical Proposal"
                value={docModal.proposalTag}
                onChange={e => setDocModal(prev => ({ ...prev, proposalTag: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Title</label>
            <input
              type="text"
              placeholder="e.g. Integrated Enterprise Intelligence"
              value={docModal.title}
              onChange={e => setDocModal(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Title Platform</label>
              <input
                type="text"
                placeholder="e.g. Platform"
                value={docModal.titlePlatform}
                onChange={e => setDocModal(prev => ({ ...prev, titlePlatform: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Duration</label>
              <input
                type="text"
                placeholder="e.g. 20 Weeks"
                value={docModal.duration}
                onChange={e => setDocModal(prev => ({ ...prev, duration: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Subtitle</label>
            <textarea
              placeholder="Cover Subtitle text..."
              value={docModal.subtitle}
              onChange={e => setDocModal(prev => ({ ...prev, subtitle: e.target.value }))}
              style={{ width: '100%', height: '60px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Tagline</label>
            <input
              type="text"
              placeholder="Proposal tagline..."
              value={docModal.tagline}
              onChange={e => setDocModal(prev => ({ ...prev, tagline: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Prepared For Company</label>
              <input
                type="text"
                placeholder="e.g. Example Company Inc."
                value={docModal.companyName}
                onChange={e => setDocModal(prev => ({ ...prev, companyName: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Distribution List (Comma separated)</label>
            <input
              type="text"
              placeholder="Sarah Jenkins (CIO), Marcus Chen (Lead Architect)"
              value={docModal.distributionList}
              onChange={e => setDocModal(prev => ({ ...prev, distributionList: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Research Validation</label>
            <input
              type="text"
              placeholder="Core solvers validated against operational trace datasets..."
              value={docModal.researchValidation}
              onChange={e => setDocModal(prev => ({ ...prev, researchValidation: e.target.value }))}
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
