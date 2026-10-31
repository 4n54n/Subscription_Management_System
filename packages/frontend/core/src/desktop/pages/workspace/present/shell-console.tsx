import React from 'react';
import { useTheme } from 'next-themes';

interface ShellConsoleProps {
  isTerminalOpen: boolean;
  isHost: boolean;
  isTerminalFocused: boolean;
  toggleTerminal: () => void;
  termRef: React.RefObject<HTMLDivElement | null>;
  termInstanceRef: React.RefObject<any>;
}

export const ShellConsole: React.FC<ShellConsoleProps> = ({
  isTerminalOpen,
  isHost,
  isTerminalFocused,
  toggleTerminal,
  termRef,
  termInstanceRef,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!isTerminalOpen) return null;

  const bgColor = '#090c10';
  const borderColor = 'rgba(0, 255, 102, 0.25)';
  const shadowColor = 'rgba(0, 0, 0, 0.6)';
  const headerBgColor = '#0d1117';
  const headerBorderColor = 'rgba(0, 255, 102, 0.15)';
  const titleColor = '#00ff66';

  return (
    <div
      onClick={() => {
        if (isHost && termInstanceRef.current) {
          termInstanceRef.current.focus();
        }
      }}
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        width: '520px',
        height: '400px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        boxShadow: `0 20px 50px ${shadowColor}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 999,
        fontFamily: 'var(--affine-font-mono-family), monospace',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: isHost ? 'text' : 'default',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '36px',
          background: headerBgColor,
          borderBottom: `1px solid ${headerBorderColor}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        {/* macOS decorative circles */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#ff5f56',
            }}
          />
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#ffbd2e',
            }}
          />
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#27c93f',
            }}
          />
        </div>
        {/* Title */}
        <span
          style={{
            fontSize: '11px',
            color: titleColor,
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          bash
        </span>
        {/* Close Button (Host only) */}
        {isHost ? (
          <button
            onClick={e => {
              e.stopPropagation();
              toggleTerminal();
            }}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--affine-text-secondary-color)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
              transition: 'color 0.15s ease',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--affine-text-primary-color)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--affine-text-secondary-color)')}
          >
            ×
          </button>
        ) : (
          <div style={{ width: '14px' }} />
        )}
      </div>

      {/* Terminal Screen Container */}
      <div
        ref={termRef}
        style={{
          flex: 1,
          padding: '12px',
          background: bgColor,
          cursor: 'text',
        }}
      />
    </div>
  );
};
