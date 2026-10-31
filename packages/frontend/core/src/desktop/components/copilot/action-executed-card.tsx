import React from 'react';

interface ParameterEntry {
  key: string;
  value: string;
}

export const parseExecutedContent = (content: string) => {
  const isExecuted = content.includes('Action Executed Successfully!') || content.includes('**Action Executed Successfully!**');
  const isCancelled = content.includes('Action Cancelled') || content.includes('**Action Cancelled**');

  if (!isExecuted && !isCancelled) return null;

  // Extract action name
  const actionMatch = content.match(/(?:\*\*Action:\*\*|Action:)\s*`?([A-Za-z0-9_\s]+)`?/i);
  const actionTitle = actionMatch ? actionMatch[1].replace(/[*`_]/g, '').trim() : 'Action';

  // Extract parameters cleanly without asterisks or header lines
  const entries: ParameterEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip headers and title lines
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('action executed successfully') ||
      lower.includes('action cancelled') ||
      lower.startsWith('**action:') ||
      lower.startsWith('action:') ||
      lower.startsWith('**executed values:') ||
      lower.startsWith('executed values:') ||
      lower.startsWith('**executed parameters:') ||
      lower.startsWith('executed parameters:')
    ) {
      continue;
    }

    // Match bullet or key-value format
    const bulletMatch = trimmed.match(/^[•\-*]\s*(.+)$/);
    const contentToParse = bulletMatch ? bulletMatch[1].trim() : trimmed;

    const colonIdx = contentToParse.indexOf(':');
    if (colonIdx > 0) {
      const rawKey = contentToParse.substring(0, colonIdx).replace(/[*`_]/g, '').trim();
      const rawVal = contentToParse.substring(colonIdx + 1).replace(/[*`]/g, '').trim();

      const ignoredKeys = new Set(['action', 'executed values', 'executed parameters']);
      if (rawKey && !ignoredKeys.has(rawKey.toLowerCase())) {
        entries.push({
          key: rawKey,
          value: rawVal || 'None',
        });
      }
    }
  }

  return {
    isExecuted,
    isCancelled,
    actionTitle,
    entries,
  };
};

export const ActionExecutedCard: React.FC<{ content: string }> = ({ content }) => {
  const parsed = parseExecutedContent(content);
  if (!parsed) return null;

  const { isExecuted, actionTitle, entries } = parsed;

  if (isExecuted) {
    return (
      <div
        style={{
          margin: '10px 0',
          borderRadius: '12px',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          background: 'var(--affine-background-primary-color, #ffffff)',
          boxShadow: '0 4px 16px -2px rgba(16, 185, 129, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          width: '100%',
          fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Card Header with Success Badge */}
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(16, 185, 129, 0.08)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--affine-text-primary-color, #18181b)' }}>
              Action Executed Successfully
            </span>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(15, 98, 254, 0.1)',
              color: '#0f62fe',
              border: '1px solid rgba(15, 98, 254, 0.2)',
            }}
          >
            {actionTitle}
          </span>
        </div>

        {/* Card Body with Formatted Parameter Pills / Key-Value Grid */}
        {entries.length > 0 && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--affine-background-primary-color, #ffffff)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--affine-text-secondary-color, #71717a)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Executed Parameters
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '8px',
                background: 'var(--affine-background-secondary-color, #f4f4f5)',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--affine-border-color, #e4e4e7)',
              }}
            >
              {entries.map(({ key, value }, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color, #71717a)' }}>
                    {key}
                  </span>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--affine-text-primary-color, #18181b)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Cancelled State Box
  return (
    <div
      style={{
        margin: '10px 0',
        borderRadius: '12px',
        border: '1.5px solid rgba(239, 68, 68, 0.3)',
        background: 'var(--affine-background-primary-color, #ffffff)',
        boxShadow: '0 4px 16px -2px rgba(239, 68, 68, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        width: '100%',
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(239, 68, 68, 0.08)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--affine-text-primary-color, #18181b)' }}>
            Action Cancelled
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          {actionTitle}
        </span>
      </div>
    </div>
  );
};
