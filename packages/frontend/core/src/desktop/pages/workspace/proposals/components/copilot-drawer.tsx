import React from 'react';
import { cssVar } from '@toeverything/theme';
import { CloseIconSvg } from './icons';
import { MarkdownRenderer } from '../../documents-shared/markdown-utils';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  pendingSuggestion?: string;
}

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selection: { text: string } | null;
  onCopilotAction: (action: 'rewrite' | 'expand' | 'table') => void;
  copilotMessages: CopilotMessage[];
  onApplySuggestion: (suggestion: string, idx: number) => void;
  onRejectSuggestion: (idx: number) => void;
  isLoading: boolean;
  inputVal: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
}

export const CopilotDrawer = ({
  isOpen,
  onClose,
  selection,
  onCopilotAction,
  copilotMessages,
  onApplySuggestion,
  onRejectSuggestion,
  isLoading,
  inputVal,
  onInputChange,
  onSend,
}: CopilotDrawerProps) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '80px',
        width: '400px',
        height: '600px',
        background: cssVar('backgroundPrimaryColor'),
        borderRadius: '16px',
        border: `1px solid ${cssVar('borderColor')}`,
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9998,
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
        animation: 'fadeIn 0.25s ease-in-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${cssVar('borderColor')}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.03) 0%, rgba(59, 130, 246, 0.03) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <span style={{ fontWeight: 650, fontSize: '15px', color: cssVar('textPrimaryColor') }}>
            Proposals AI Copilot
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: cssVar('textSecondaryColor'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
          }}
        >
          <CloseIconSvg />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflow: 'hidden' }}>
        
        {/* Message History */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          
          {/* Active Selection Block inside drawer if selection is present */}
          {selection && selection.text && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.05)',
              border: '1px dashed rgba(168, 85, 247, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Selected Text
              </div>
              <div style={{ fontSize: '12px', color: cssVar('textPrimaryColor'), fontStyle: 'italic', maxHeight: '60px', overflowY: 'auto', borderLeft: '2px solid rgba(168, 85, 247, 0.5)', paddingLeft: '6px' }}>
                "{selection.text}"
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button
                  onClick={() => onCopilotAction('rewrite')}
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Rewrite
                </button>
                <button
                  onClick={() => onCopilotAction('expand')}
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Expand
                </button>
                <button
                  onClick={() => onCopilotAction('table')}
                  style={{ padding: '4px 8px', fontSize: '11px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Table
                </button>
              </div>
            </div>
          )}

          {copilotMessages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#a855f7' : cssVar('backgroundSecondaryColor'),
                color: msg.role === 'user' ? '#ffffff' : cssVar('textPrimaryColor'),
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '85%',
                fontSize: '13px',
                lineHeight: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div>
                {msg.role === 'assistant' ? (
                  <MarkdownRenderer text={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
              
              {msg.pendingSuggestion && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '4px',
                  borderTop: `1px solid ${msg.role === 'user' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  paddingTop: '8px'
                }}>
                  <button
                    onClick={() => onApplySuggestion(msg.pendingSuggestion!, idx)}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Apply Change
                  </button>
                  <button
                    onClick={() => onRejectSuggestion(idx)}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: cssVar('backgroundSecondaryColor'),
                padding: '10px 14px',
                borderRadius: '12px',
                maxWidth: '85%',
                fontSize: '13px',
                color: cssVar('textSecondaryColor'),
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#a855f7', display: 'inline-block' }}></span>
              <span>Copilot is parsing and executing...</span>
            </div>
          )}
        </div>

        {/* Input box */}
        <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '12px', marginTop: 'auto' }}>
          <input
            type="text"
            placeholder={selection ? "Ask Copilot to rewrite selection..." : "Highlight text to run AI actions..."}
            value={inputVal}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSend();
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${cssVar('borderColor')}`,
              background: cssVar('backgroundPrimaryColor'),
              color: cssVar('textPrimaryColor'),
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            onClick={onSend}
            disabled={isLoading || !inputVal.trim()}
            style={{
              padding: '8px 16px',
              background: '#a855f7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              opacity: (isLoading || !inputVal.trim()) ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
