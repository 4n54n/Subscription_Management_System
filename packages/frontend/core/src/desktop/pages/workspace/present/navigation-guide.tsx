import React, { useState, useMemo } from 'react';

// Premium Custom Icons using SVGs
export const BrowserCursorIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
    <line x1="2" y1="8" x2="22" y2="8" />
    <circle cx="6" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="9" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
    <path
      d="M10 10l5 5-2 0.7 2 3.5-1 0.6-2-3.5-1.5 1.5V10z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const MegaphoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

interface NavigationGuideProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  executionSelectedUsers: string[];
  setExecutionSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  consoleTab: 'left' | 'right';
  setConsoleTab: (tab: 'left' | 'right') => void;
  sendBrowserCommand: (action: string, elementKey: string | null, payload?: any) => void;
}

export const NavigationGuide: React.FC<NavigationGuideProps> = ({
  isOpen,
  onClose,
  members,
  executionSelectedUsers,
  setExecutionSelectedUsers,
  consoleTab,
  setConsoleTab,
  sendBrowserCommand,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter attendees (guests) by search query
  const attendees = useMemo(() => {
    return members.filter(m => !m.isHost);
  }, [members]);

  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return attendees;
    return attendees.filter(m =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [attendees, searchQuery]);

  const isAllSelected = useMemo(() => {
    return executionSelectedUsers.includes('all');
  }, [executionSelectedUsers]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setExecutionSelectedUsers([]);
    } else {
      setExecutionSelectedUsers(['all']);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (isAllSelected) {
      // Clicking individual targets deselects "All" and selects only this user!
      setExecutionSelectedUsers([userId]);
    } else {
      if (executionSelectedUsers.includes(userId)) {
        setExecutionSelectedUsers(prev => prev.filter(id => id !== userId));
      } else {
        const updated = [...executionSelectedUsers, userId];
        // If all individual members are selected, promote to 'all' for clean Yjs state
        if (updated.length === attendees.length && attendees.length > 0) {
          setExecutionSelectedUsers(['all']);
        } else {
          setExecutionSelectedUsers(updated);
        }
      }
    }
  };

  const leftElements = [
    { key: 'left_sidebar', name: 'Left Sidebar (frame switcher)', desc: 'Frame outline and topics list panel' },
    { key: 'controls_bar', name: 'A/V Controls Bar', desc: 'Bottom media controls bar' },
    { key: 'self_view', name: 'Self Video Box', desc: 'Your local camera preview card' },
    { key: 'share_screen', name: 'Screen Share Button', desc: 'Main screen sharing toggle button' },
    { key: 'av_settings', name: 'Audio/Video settings', desc: 'Input and output device options' },
    { key: 'follow_button', name: 'Follow Button (Participant Video Box)', desc: 'Follow/Unfollow participant view toggle' },
  ];

  const rightElements = [
    { key: 'right_sidebar_btn', name: 'Right Sidebar Toggle Button', desc: 'Open or close right sidebar panel' },
    { key: 'chat_tab', name: 'Chat Tab', desc: 'Sleek instant chat tab' },
    { key: 'gemini_tab', name: 'GPT Tab', desc: 'Gemini AI assistant panel' },
    { key: 'translate_tab', name: 'AI Translation Tab', desc: 'Speech and chat translation tools' },
  ];

  const activeElements = consoleTab === 'left' ? leftElements : rightElements;

  return (
    <div className="present-modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="present-modal-container"
        style={{
          width: '560px',
          maxWidth: '95vw',
          background: 'var(--affine-background-primary-color)',
          border: '1px solid var(--affine-border-color)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
          borderRadius: '16px',
          padding: '24px',
          gap: '20px',
          color: 'var(--affine-text-primary-color)',
          fontFamily: 'var(--affine-font-family)',
          position: 'relative',
        }}
      >
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--affine-border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrowserCursorIcon style={{ width: '20px', height: '20px', color: 'var(--affine-brand-color, #1e88e5)' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--affine-text-primary-color)' }}>Navigation Guide</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--affine-text-secondary-color)',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
              borderRadius: '6px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--affine-text-primary-color)'; e.currentTarget.style.background = 'var(--affine-hover-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--affine-text-secondary-color)'; e.currentTarget.style.background = 'transparent'; }}
          >
            &times;
          </button>
        </div>

        {/* User Search & Checklist Box */}
        <div
          style={{
            background: 'var(--affine-background-secondary-color)',
            border: '1px solid var(--affine-border-color)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Target Attendees
            </span>
            <button
              onClick={handleToggleSelectAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--affine-brand-color, #1e88e5)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* User Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon style={{ position: 'absolute', left: '10px', color: 'var(--affine-text-secondary-color)' }} />
            <input
              type="text"
              placeholder="Search attendees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                fontSize: '12px',
                background: 'var(--affine-background-primary-color)',
                border: '1px solid var(--affine-border-color)',
                borderRadius: '8px',
                color: 'var(--affine-text-primary-color)',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--affine-brand-color, #1e88e5)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--affine-border-color)'}
            />
          </div>

          {/* Attendees List Checklist */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              maxHeight: '64px',
              overflowY: 'auto',
              paddingRight: '2px',
              background: 'var(--affine-background-secondary-color)',
              borderRadius: '6px',
              padding: '6px',
              border: '1px solid var(--affine-border-color)',
            }}
          >
            {/* All Checkbox tag */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                background: isAllSelected ? 'var(--affine-hover-color)' : 'var(--affine-background-primary-color)',
                border: `1px solid ${isAllSelected ? 'var(--affine-brand-color, #1e88e5)' : 'var(--affine-border-color)'}`,
                padding: '3px 6px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                style={{
                  cursor: 'pointer',
                  accentColor: 'var(--affine-brand-color, #1e88e5)',
                  width: '11px',
                  height: '11px',
                }}
              />
              <span style={{ fontWeight: 600, color: 'var(--affine-text-primary-color)' }}>
                All ({attendees.length})
              </span>
            </label>

            {filteredAttendees.map(m => {
              const isSelected = isAllSelected || executionSelectedUsers.includes(m.sessionId);
              const initials = m.name ? m.name.charAt(0).toUpperCase() : 'A';
              return (
                <label
                   key={m.sessionId}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     fontSize: '10px',
                     background: isSelected ? 'var(--affine-hover-color)' : 'var(--affine-background-primary-color)',
                     border: `1px solid ${isSelected ? 'var(--affine-brand-color, #1e88e5)' : 'var(--affine-border-color)'}`,
                     padding: '3px 6px',
                     borderRadius: '6px',
                     cursor: 'pointer',
                     transition: 'all 0.15s ease',
                   }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleUser(m.sessionId)}
                    style={{
                      cursor: 'pointer',
                      accentColor: 'var(--affine-brand-color, #1e88e5)',
                      width: '11px',
                      height: '11px',
                    }}
                  />
                  {/* Small avatar */}
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: 'var(--affine-background-secondary-color)',
                      fontSize: '8px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--affine-text-secondary-color)',
                      border: '1px solid var(--affine-border-color)',
                    }}
                  >
                    {initials}
                  </div>
                  <span style={{ color: 'var(--affine-text-primary-color)' }}>
                    {m.name}
                  </span>
                </label>
              );
            })}

            {attendees.length === 0 && (
              <span style={{ fontSize: '10px', color: 'var(--affine-text-secondary-color)', fontStyle: 'italic', margin: '4px 0' }}>
                No other attendees online
              </span>
            )}
            {attendees.length > 0 && filteredAttendees.length === 0 && (
              <span style={{ fontSize: '10px', color: 'var(--affine-text-secondary-color)', fontStyle: 'italic', margin: '4px 0' }}>
                No attendees match filter
              </span>
            )}
          </div>
        </div>

        {/* Tab Switchers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--affine-border-color)', gap: '4px' }}>
          <button
            onClick={() => setConsoleTab('left')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: consoleTab === 'left' ? 'var(--affine-text-primary-color)' : 'var(--affine-text-secondary-color)',
              borderBottom: consoleTab === 'left' ? '2px solid var(--affine-brand-color, #1e88e5)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            Left Sidebar Elements
          </button>
          <button
            onClick={() => setConsoleTab('right')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: consoleTab === 'right' ? 'var(--affine-text-primary-color)' : 'var(--affine-text-secondary-color)',
              borderBottom: consoleTab === 'right' ? '2px solid var(--affine-brand-color, #1e88e5)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            Right Sidebar Elements
          </button>
        </div>

        {/* Action items list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '230px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {activeElements.map(el => (
            <div
              key={el.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--affine-background-secondary-color)',
                border: '1px solid var(--affine-border-color)',
                borderRadius: '10px',
                gap: '12px',
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--affine-text-primary-color)' }}>
                  {el.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--affine-text-secondary-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {el.desc}
                </span>
              </div>
              
              <button
                onClick={() => {
                  sendBrowserCommand('highlight', el.key);
                }}
                disabled={executionSelectedUsers.length === 0}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--affine-text-primary-color)',
                  background: 'var(--affine-background-primary-color)',
                  border: '1px solid var(--affine-border-color)',
                  borderRadius: '8px',
                  cursor: executionSelectedUsers.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: executionSelectedUsers.length === 0 ? 0.4 : 1,
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (executionSelectedUsers.length > 0) {
                    e.currentTarget.style.background = 'var(--affine-hover-color)';
                  }
                }}
                onMouseLeave={e => {
                  if (executionSelectedUsers.length > 0) {
                    e.currentTarget.style.background = 'var(--affine-background-primary-color)';
                  }
                }}
              >
                Highlight
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
