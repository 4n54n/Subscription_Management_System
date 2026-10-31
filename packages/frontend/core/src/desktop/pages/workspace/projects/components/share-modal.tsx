import React from 'react';
import { cssVar } from '@toeverything/theme';
import { Portal } from './portal';
import { CloseIconSvg } from './icons';
import * as styles from '../styles.css';

interface ShareModalProps {
  isShareModalOpen: boolean;
  setIsShareModalOpen: (val: boolean) => void;
  shareModalProjectId: string | null;
  isGeneratingKey: boolean;
  generatedShareLink: string;
  copiedLink: boolean;
  handleCopyLink: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isShareModalOpen,
  setIsShareModalOpen,
  shareModalProjectId,
  isGeneratingKey,
  generatedShareLink,
  copiedLink,
  handleCopyLink,
}) => {
  if (!isShareModalOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={() => setIsShareModalOpen(false)}>
        <div className={styles.modal} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              {shareModalProjectId ? 'Share Project' : 'Share Projects Space'}
            </h3>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setIsShareModalOpen(false)}
            >
              <CloseIconSvg />
            </button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px 24px', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.5, color: cssVar('textSecondaryColor') }}>
              Authorized guest users can access this {shareModalProjectId ? 'shared project' : "workspace's shared projects"} by verifying their email.
            </p>
            
            {isGeneratingKey ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '32px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(15, 98, 254, 0.15)',
                  borderTopColor: '#0f62fe',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ fontSize: '12px', color: cssVar('textSecondaryColor') }}>Generating credentials...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Link Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Guest View Link
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      fontSize: '12px',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      border: `1px solid ${cssVar('borderColor')}`,
                      borderRadius: '8px',
                      color: cssVar('textPrimaryColor'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {generatedShareLink}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className={styles.btn}
                      style={{
                        backgroundColor: copiedLink ? '#10b981' : '#0f62fe',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        minWidth: '90px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};
