import React, { useState, useEffect, useRef } from 'react';
import { cssVar } from '@toeverything/theme';
import { getPriorityColor, getStatusColor, isOverdue } from '../utils/project-helpers';

export const BoardCard = React.memo(({
  issue,
  issueId,
  onViewDetails,
  onUpdateStatus,
  onUpdatePriority,
  onAssignToMe,
  onDelete,
  currentUser,
  isShareMode,
  isFromBlueprint,
}: {
  issue: any;
  issueId: string;
  onViewDetails: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePriority: (id: string, priority: string) => void;
  onAssignToMe: (id: string) => void;
  onDelete: (id: string) => void;
  currentUser: any;
  isShareMode?: boolean;
  isFromBlueprint?: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showMenu]);

  const pri = getPriorityColor(issue.priority);
  const sta = getStatusColor(issue.status);
  const isIssueOverdue = isOverdue(issue.dueDate, issue.status);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      style={{
        position: 'relative',
        padding: '16px',
        borderRadius: '12px',
        background: cssVar('backgroundPrimaryColor'),
        border: isIssueOverdue ? '2px solid #ef4444' : `1px solid ${cssVar('borderColor')}`,
        boxShadow: isHovered
          ? '0 10px 15px -3px rgba(30, 136, 229, 0.1), 0 4px 6px -2px rgba(30, 136, 229, 0.05)'
          : isIssueOverdue
            ? '0 0 10px rgba(239, 68, 68, 0.08)'
            : '0 2px 4px rgba(0,0,0,0.02)',
        borderColor: isHovered
          ? '#1e88e5'
          : isIssueOverdue
            ? '#ef4444'
            : cssVar('borderColor'),
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isShareMode ? 'pointer' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        userSelect: 'none',
        zIndex: showMenu ? 100 : (isHovered ? 10 : 1),
      }}
      draggable={!isShareMode}
      onDragStart={isShareMode ? undefined : (e) => {
        e.dataTransfer.setData('text/plain', issue.id);
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.quick-actions-btn') || (e.target as HTMLElement).closest('.quick-actions-menu')) {
          return;
        }
        onViewDetails(issue.id);
      }}
    >
      {/* Top row: ID, type, and quick actions trigger */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), letterSpacing: '0.5px' }}>
          {issueId}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          {isFromBlueprint && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(30, 136, 229, 0.08)',
              color: '#1e88e5',
              border: '1px solid rgba(30, 136, 229, 0.15)',
            }}>
              Blueprint
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(59, 130, 246, 0.08)',
            color: '#3b82f6'
          }}>
            {issue.type || 'Task'}
          </span>
          
          {!isShareMode && (
            <button
              className="quick-actions-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(prev => !prev);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: cssVar('textSecondaryColor'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '4px',
                transition: 'all 0.2s',
                opacity: (isHovered || showMenu) ? 1 : 0,
              }}
              title="Quick actions"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          )}

          {showMenu && (
            <div
              ref={menuRef}
              className="quick-actions-menu"
              style={{
                position: 'absolute',
                top: '24px',
                right: '0',
                width: '160px',
                background: cssVar('backgroundSecondaryColor'),
                border: `1px solid ${cssVar('borderColor')}`,
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onAssignToMe(issue.id); setShowMenu(false); }}
                style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: cssVar('textPrimaryColor'), borderRadius: '4px', fontWeight: 500 }}
              >
                Assign to Me
              </button>
              <div style={{ height: '1px', background: cssVar('borderColor'), margin: '4px 0' }} />
              <div style={{ padding: '4px 8px', fontSize: '9px', color: cssVar('textSecondaryColor'), fontWeight: 700, letterSpacing: '0.5px' }}>MOVE TO STATUS</div>
              {['Backlog', 'Todo', 'InProgress', 'InReview', 'Testing', 'Done'].map(st => (
                <button
                  key={st}
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(issue.id, st); setShowMenu(false); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    textAlign: 'left',
                    background: issue.status === st ? 'rgba(30, 136, 229, 0.08)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: issue.status === st ? '#1e88e5' : cssVar('textPrimaryColor'),
                    borderRadius: '4px'
                  }}
                >
                  {st === 'InProgress' ? 'In Progress' : st === 'InReview' ? 'In Review' : st}
                </button>
              ))}
              <div style={{ height: '1px', background: cssVar('borderColor'), margin: '4px 0' }} />
              <div style={{ padding: '4px 8px', fontSize: '9px', color: cssVar('textSecondaryColor'), fontWeight: 700, letterSpacing: '0.5px' }}>SET PRIORITY</div>
              {['Low', 'Medium', 'High', 'Critical'].map(pr => (
                <button
                  key={pr}
                  onClick={(e) => { e.stopPropagation(); onUpdatePriority(issue.id, pr); setShowMenu(false); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    textAlign: 'left',
                    background: issue.priority === pr ? 'rgba(30, 136, 229, 0.08)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: issue.priority === pr ? '#1e88e5' : cssVar('textPrimaryColor'),
                    borderRadius: '4px'
                  }}
                >
                  {pr}
                </button>
              ))}
              <div style={{ height: '1px', background: cssVar('borderColor'), margin: '4px 0' }} />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(issue.id); setShowMenu(false); }}
                style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '4px', fontWeight: 500 }}
              >
                Delete Issue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: '14px', fontWeight: 600, color: cssVar('textPrimaryColor'), lineHeight: 1.4 }}>
        {issue.title}
      </div>

      {/* Middle row: badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 700,
            background: sta.bg,
            color: sta.text,
          }}
        >
          {issue.status === 'InProgress' ? 'In Progress' : issue.status === 'InReview' ? 'In Review' : issue.status}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 700,
            background: pri.bg,
            color: pri.text,
          }}
        >
          {issue.priority}
        </span>
      </div>

      {/* Custom field details (Sprint, Module, Est, Due Date) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: cssVar('textSecondaryColor'), borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '8px', marginTop: '4px' }}>
        {issue.cycle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.6 }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontWeight: 500 }}>{issue.cycle.name}</span>
          </div>
        )}
        {issue.module && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.6 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span style={{ fontWeight: 500 }}>{issue.module.name}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.6 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="12" x2="16" y2="12" />
          </svg>
          <span style={{ fontWeight: 500 }}>Estimate: {issue.estimatedTime || 0}h</span>
        </div>
        {issue.dueDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isIssueOverdue ? '#ef4444' : cssVar('textSecondaryColor') }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.6 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontWeight: 600 }}>Due: {new Date(issue.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Footer assignee avatars */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {issue.assignees && issue.assignees.map((ass: any) => (
            <span
              key={ass.userId}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: cssVar('primaryColor'),
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                border: `2px solid ${cssVar('backgroundPrimaryColor')}`,
              }}
              title={ass.user?.name || ass.user?.email}
            >
              {(ass.user?.name || ass.user?.email || 'U').charAt(0).toUpperCase()}
            </span>
          ))}
          {(!issue.assignees || issue.assignees.length === 0) && (
            <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>
      </div>
    </div>
  );
});
