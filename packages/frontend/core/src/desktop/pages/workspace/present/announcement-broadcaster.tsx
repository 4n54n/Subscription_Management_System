import React, { useState, useMemo } from 'react';
import { MegaphoneIcon, SearchIcon } from './navigation-guide';

interface AnnouncementBroadcasterProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  selectedUsers: string[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  executionMessage: string;
  setExecutionMessage: (message: string) => void;
  sendBrowserCommand: (action: string, elementKey: string | null, payload?: any, customTargets?: string[]) => void;
}

export const AnnouncementBroadcaster: React.FC<AnnouncementBroadcasterProps> = ({
  isOpen,
  onClose,
  members,
  selectedUsers,
  setSelectedUsers,
  executionMessage,
  setExecutionMessage,
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
    return selectedUsers.includes('all');
  }, [selectedUsers]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(['all']);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (isAllSelected) {
      // Clicking individual targets deselects "All" and selects only this user!
      setSelectedUsers([userId]);
    } else {
      if (selectedUsers.includes(userId)) {
        setSelectedUsers(prev => prev.filter(id => id !== userId));
      } else {
        const updated = [...selectedUsers, userId];
        if (updated.length === attendees.length && attendees.length > 0) {
          setSelectedUsers(['all']);
        } else {
          setSelectedUsers(updated);
        }
      }
    }
  };

  const handleSendAnnouncement = () => {
    if (!executionMessage.trim()) return;
    // Fix: pass selectedUsers as the fourth parameter customTargets so that the toast targets correctly!
    sendBrowserCommand('toast', null, { message: executionMessage }, selectedUsers);
    setExecutionMessage('');
    onClose();
  };

  return (
    <div className="present-modal-overlay" style={{ zIndex: 10000, fontFamily: 'var(--affine-font-family)' }}>
      <div
        className="present-modal-container"
        style={{
          width: '500px',
          maxWidth: '95vw',
          background: 'var(--affine-background-primary-color)',
          border: '1px solid var(--affine-border-color)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.15)',
          borderRadius: '16px',
          padding: '24px',
          gap: '20px',
          color: 'var(--affine-text-primary-color)',
          fontFamily: 'var(--affine-font-family)',
        }}
      >
        {/* Header Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--affine-border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MegaphoneIcon style={{ width: '20px', height: '20px', color: 'var(--affine-brand-color, #1e88e5)' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--affine-text-primary-color)' }}>Presenter Announcement</span>
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
              const isSelected = isAllSelected || selectedUsers.includes(m.sessionId);
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

        {/* Announcement Message Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Announcement Message
          </span>
          <textarea
            placeholder="Type announcement message to broadcast to selected attendees..."
            value={executionMessage}
            onChange={(e) => setExecutionMessage(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              background: 'var(--affine-background-primary-color)',
              border: '1px solid var(--affine-border-color)',
              borderRadius: '10px',
              padding: '12px 14px',
              color: 'var(--affine-text-primary-color)',
              fontSize: '12.5px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--affine-brand-color, #1e88e5)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--affine-border-color)'}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--affine-border-color)', paddingTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--affine-border-color)',
              color: 'var(--affine-text-primary-color)',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--affine-hover-color)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleSendAnnouncement}
            disabled={selectedUsers.length === 0 || !executionMessage.trim()}
            style={{
              background: 'var(--affine-brand-color, #1e88e5)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '8px 20px',
              cursor: (selectedUsers.length === 0 || !executionMessage.trim()) ? 'not-allowed' : 'pointer',
              opacity: (selectedUsers.length === 0 || !executionMessage.trim()) ? 0.5 : 1,
              transition: 'opacity 0.2s',
              fontFamily: 'inherit',
            }}
          >
            Broadcast
          </button>
        </div>
      </div>
    </div>
  );
};
