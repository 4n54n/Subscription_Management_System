import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCompanyProfile } from '../documents-shared/use-company-profile';
import oneLogoLight from '../../../../assets/one-logo-light.png';
import { createPortal } from 'react-dom';
import { Switch, Menu, MenuItem, RadioGroup, type RadioItem } from '@affine/component';
import { Virtuoso } from 'react-virtuoso';
import { cssVar } from '@toeverything/theme';
import { useSearchParams } from 'react-router-dom';
import { useService, useLiveData } from '@toeverything/infra';
import { useProjectCopilotSync } from '../../../components/copilot/use-copilot-sync';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { CollectionService } from '@affine/core/modules/collection';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { ViewBody, ViewTitle, ViewIcon, ViewHeader } from '@affine/core/modules/workbench';
import { Header } from '@affine/core/components/pure/header';
import { useQuery } from '@affine/core/components/hooks/use-query';
import { useMutation, useMutateQueryResource } from '@affine/core/components/hooks/use-mutation';
import {
  projectsQuery,
  projectQuery,
  createProjectMutation,
  updateProjectMutation,
  deleteProjectMutation,
  projectAnalyticsQuery,
  projectModulesQuery,
  createProjectModuleMutation,
  updateProjectModuleMutation,
  deleteProjectModuleMutation,
  projectCyclesQuery,
  createProjectCycleMutation,
  updateProjectCycleMutation,
  deleteProjectCycleMutation,
  projectReleasesQuery,
  createProjectReleaseMutation,
  updateProjectReleaseMutation,
  deleteProjectReleaseMutation,
  projectIssuesQuery,
  projectIssueQuery,
  createProjectIssueMutation,
  updateProjectIssueMutation,
  deleteProjectIssueMutation,
  projectLabelsQuery,
  createProjectLabelMutation,
  deleteProjectLabelMutation,
  projectIssueCommentsQuery,
  createProjectIssueCommentMutation,
  deleteProjectIssueCommentMutation,
  getMembersByWorkspaceIdQuery,
  getCurrentUserQuery,
  workspaceGeminiSettingQuery,
  getOrCreateProjectShareKeyQuery,
  sendProjectShareGuestOtpMutation,
  verifyProjectShareGuestOtpMutation,
  projectDocsConfigQuery,
  projectDocumentsQuery,
} from '@affine/graphql';
import { GraphQLService } from '@affine/core/modules/cloud';
import {
  Logo1Icon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
  CloseIcon,
  SearchIcon,
  LockIcon,
  AiIcon,
  TodayIcon,
  FolderIcon,
  ViewLayersIcon,
  ShareIcon,
  ArrowLeftBigIcon,
  ArrowRightBigIcon,
  InformationIcon,
  DoneIcon,
  FilterIcon,
} from '@blocksuite/icons/rc';
import { ProjectDocumentsTab } from './docs-tab';
import { ProjectBlueprintTab } from './blueprint-tab';

import * as styles from './styles.css';

// --- TABLER ICONS MATCHING APPLICATION THEME ---
const PlusIconSvg = () => <PlusIcon style={{ width: 16, height: 16 }} />;
const BriefcaseIconSvg = () => <FolderIcon style={{ width: 20, height: 20 }} />;
const TrendUpIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const BugIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M12 21a6 6 0 0 0 6-6v-3a6 6 0 0 0-12 0v3a6 6 0 0 0 6 6z" />
    <path d="M12 9v12" />
    <path d="M6 13H2" />
    <path d="M22 13h-4" />
    <path d="M7 6.5 4 3.5" />
    <path d="M17 6.5 20 3.5" />
    <path d="M6.5 18 3.5 21" />
    <path d="M17.5 18 20.5 21" />
  </svg>
);
const ClockIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);
const ViewLayersIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
const CalendarIconSvg = () => <TodayIcon style={{ width: 20, height: 20 }} />;
const TrashIconSvg = () => <DeleteIcon style={{ width: 14, height: 14 }} />;
const EditIconSvg = () => <EditIcon style={{ width: 14, height: 14 }} />;
const CloseIconSvg = () => <CloseIcon style={{ width: 16, height: 16 }} />;
const ChevronDownIconSvg = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const SearchIconSvg = () => <SearchIcon style={{ width: 16, height: 16 }} />;
const DragIconSvg = () => (
  <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" style={{ opacity: 0.4 }}>
    <circle cx="2" cy="2" r="1.5" />
    <circle cx="2" cy="8" r="1.5" />
    <circle cx="2" cy="14" r="1.5" />
    <circle cx="10" cy="2" r="1.5" />
    <circle cx="10" cy="8" r="1.5" />
    <circle cx="10" cy="14" r="1.5" />
  </svg>
);

// --- COMPONENT HELPERS ---
const isOverdue = (dateStr: string | null | undefined, status?: string) => {
  if (!dateStr) return false;
  const lowerStatus = status ? status.toLowerCase() : '';
  if (lowerStatus === 'done' || lowerStatus === 'completed' || lowerStatus === 'released') return false;
  return new Date(dateStr) < new Date();
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'critical': return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' };
    case 'high': return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' };
    case 'medium': return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' };
    default: return { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748b' };
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'done': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    case 'testing': return { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' };
    case 'inreview': return { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' };
    case 'inprogress': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    case 'todo': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    default: return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' }; // Backlog
  }
};

const BoardCard = React.memo(({
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
  isNearBottom = false,
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
  isNearBottom?: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right?: number; maxHeight?: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const updateMenuPosition = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top: number | undefined;
      let bottom: number | undefined;
      let maxHeight = 280;

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        bottom = window.innerHeight - rect.top + 4;
        maxHeight = Math.min(280, Math.max(120, rect.top - 12));
      } else {
        top = rect.bottom + 4;
        maxHeight = Math.min(280, Math.max(120, window.innerHeight - rect.bottom - 12));
      }

      setMenuPos({
        top,
        bottom,
        right: Math.max(8, window.innerWidth - rect.right),
        maxHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (!showMenu) return;

    updateMenuPosition();

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showMenu, updateMenuPosition]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!showMenu) {
      updateMenuPosition();
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  };

  const pri = getPriorityColor(issue.priority);
  const sta = getStatusColor(issue.status);
  const isIssueOverdue = isOverdue(issue.dueDate, issue.status);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); }}
      style={{
        position: 'relative',
        padding: '16px',
        borderRadius: '12px',
        background: cssVar('backgroundPrimaryColor'),
        border: '1px solid',
        borderColor: isHovered
          ? '#a855f7'
          : isIssueOverdue
            ? '#ef4444'
            : cssVar('borderColor'),
        boxShadow: isHovered
          ? '0 10px 15px -3px rgba(168, 85, 247, 0.1), 0 4px 6px -2px rgba(168, 85, 247, 0.05)'
          : isIssueOverdue
            ? '0 0 10px rgba(239, 68, 68, 0.08)'
            : '0 2px 4px rgba(0,0,0,0.02)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        userSelect: 'none',
        width: '100%',
        boxSizing: 'border-box',
        maxWidth: '100%',
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
              background: 'rgba(168, 85, 247, 0.08)',
              color: '#a855f7',
              border: '1px solid rgba(168, 85, 247, 0.15)',
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
              ref={btnRef}
              className="quick-actions-btn"
              onClick={handleToggleMenu}
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

          {showMenu && menuPos && createPortal(
            <div
              ref={menuRef}
              className="quick-actions-menu"
              style={{
                position: 'fixed',
                top: menuPos.top !== undefined ? `${menuPos.top}px` : 'auto',
                bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : 'auto',
                right: menuPos.right !== undefined ? `${menuPos.right}px` : 'auto',
                maxHeight: menuPos.maxHeight ? `${menuPos.maxHeight}px` : '280px',
                overflowY: 'auto',
                width: '160px',
                background: cssVar('backgroundSecondaryColor'),
                border: `1px solid ${cssVar('borderColor')}`,
                borderRadius: '8px',
                boxShadow: '0 16px 36px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)',
                zIndex: 100000,
                display: 'flex',
                flexDirection: 'column',
                padding: '4px',
              }}
              onClick={(e) => e.stopPropagation()}
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
                    background: issue.status === st ? 'rgba(168, 85, 247, 0.08)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: issue.status === st ? '#a855f7' : cssVar('textPrimaryColor'),
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
                    background: issue.priority === pr ? 'rgba(168, 85, 247, 0.08)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: issue.priority === pr ? '#a855f7' : cssVar('textPrimaryColor'),
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
            </div>,
            document.body
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
const MarkdownRenderer = ({ text }: { text: string }) => {
  const parts = useMemo(() => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const renderedElements: React.ReactNode[] = [];

    const parseInline = (lineText: string): React.ReactNode[] => {
      const inlineRegex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+`)/g;
      const tokens = lineText.split(inlineRegex);
      return tokens.map((tok, idx) => {
        if (tok.startsWith('**') && tok.endsWith('**')) {
          return <strong key={idx} style={{ fontWeight: 700 }}>{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith('*') && tok.endsWith('*')) {
          return <em key={idx} style={{ fontStyle: 'italic' }}>{tok.slice(1, -1)}</em>;
        }
        if (tok.startsWith('`') && tok.endsWith('`')) {
          return (
            <code
              key={idx}
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#a855f7',
                padding: '2px 5px',
                borderRadius: '4px',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                fontSize: '11px',
              }}
            >
              {tok.slice(1, -1)}
            </code>
          );
        }
        return tok;
      });
    };

    lines.forEach((line, lineIdx) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const codeText = codeBlockContent.join('\n');
          renderedElements.push(
            <pre
              key={`code-${lineIdx}`}
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                fontSize: '11.5px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: '10px 0',
                border: `1px solid ${cssVar('borderColor')}`,
              }}
            >
              {codeText}
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={lineIdx} style={{ fontSize: '18px', fontWeight: 700, margin: '12px 0 6px 0', color: cssVar('textPrimaryColor') }}>{parseInline(line.slice(2))}</h1>);
        return;
      }
      if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={lineIdx} style={{ fontSize: '16px', fontWeight: 650, margin: '10px 0 6px 0', color: cssVar('textPrimaryColor') }}>{parseInline(line.slice(3))}</h2>);
        return;
      }
      if (line.startsWith('### ')) {
        renderedElements.push(<h3 key={lineIdx} style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 4px 0', color: cssVar('textPrimaryColor') }}>{parseInline(line.slice(4))}</h3>);
        return;
      }

      if (line.startsWith('> ')) {
        renderedElements.push(
          <blockquote
            key={lineIdx}
            style={{
              borderLeft: '3px solid #a855f7',
              paddingLeft: '10px',
              color: cssVar('textSecondaryColor'),
              fontStyle: 'italic',
              margin: '6px 0',
            }}
          >
            {parseInline(line.slice(2))}
          </blockquote>
        );
        return;
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanLine = line.trim().slice(2);
        renderedElements.push(
          <div key={lineIdx} style={{ display: 'flex', gap: '6px', margin: '4px 0 4px 12px' }}>
            <span style={{ color: '#a855f7' }}>•</span>
            <span>{parseInline(cleanLine)}</span>
          </div>
        );
        return;
      }

      const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const indent = numMatch[1];
        const num = numMatch[2];
        const rest = numMatch[3];
        renderedElements.push(
          <div key={lineIdx} style={{ display: 'flex', gap: '6px', margin: `4px 0 4px ${12 + indent.length * 4}px` }}>
            <span style={{ color: '#a855f7', fontWeight: 600 }}>{num}.</span>
            <span>{parseInline(rest)}</span>
          </div>
        );
        return;
      }

      if (line.trim() === '') {
        renderedElements.push(<div key={lineIdx} style={{ height: '8px' }} />);
      } else {
        renderedElements.push(<p key={lineIdx} style={{ margin: '4px 0', lineHeight: 1.5 }}>{parseInline(line)}</p>);
      }
    });

    if (inCodeBlock && codeBlockContent.length > 0) {
      const codeText = codeBlockContent.join('\n');
      renderedElements.push(
        <pre
          key={`code-end`}
          style={{
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '12px',
            borderRadius: '8px',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
            fontSize: '11.5px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            margin: '10px 0',
            border: `1px solid ${cssVar('borderColor')}`,
          }}
        >
          {codeText}
        </pre>
      );
    }

    return renderedElements;
  }, [text]);

  return <div style={{ wordBreak: 'break-word' }}>{parts}</div>;
};

const statusFilterRadioItems: RadioItem[] = [
  {
    value: 'all',
    label: 'All Projects',
    testId: 'project-status-all',
  },
  {
    value: 'Planning',
    label: 'Planning',
    testId: 'project-status-planning',
  },
  {
    value: 'Active',
    label: 'Active',
    testId: 'project-status-active',
  },
  {
    value: 'Maintenance',
    label: 'Maintenance',
    testId: 'project-status-maintenance',
  },
  {
    value: 'Completed',
    label: 'Completed',
    testId: 'project-status-completed',
  },
];

const tabRadioItems: RadioItem[] = [
  { value: 'overview', label: 'Overview', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'issues', label: 'Work Items', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'board', label: 'Board', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'cycles', label: 'Cycles', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'releases', label: 'Releases', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'modules', label: 'Modules', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'blueprint', label: 'Blueprint', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
  { value: 'documents', label: 'Documents', style: { flex: '0 0 auto', padding: '0 18px', fontSize: '13px', fontWeight: 600 } },
];

export const Component = () => {
  const currentWorkspace = useService(WorkspaceService).workspace;
  const workspaceId = currentWorkspace.id;
  const companyProfile = useCompanyProfile();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawProjectParam = searchParams.get('project');
  const rawTabParam = searchParams.get('tab');

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  const storedProjectId = useMemo(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(`affine_active_project_${workspaceId}`) : null;
  }, [workspaceId]);

  const storedTab = useMemo(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(`affine_active_tab_${workspaceId}`) : null;
  }, [workspaceId]);

  const selectedProjectId = rawProjectParam !== null
    ? rawProjectParam
    : (isInitialLoad ? (storedProjectId || '') : '');

  const currentTab = rawTabParam !== null
    ? rawTabParam
    : (isInitialLoad ? (storedTab || 'overview') : 'overview');

  useEffect(() => {
    if (isInitialLoad && selectedProjectId && (!rawProjectParam || !rawTabParam)) {
      const params: any = { project: selectedProjectId, tab: currentTab };
      setSearchParams(params, { replace: true });
    }
  }, [isInitialLoad, rawProjectParam, rawTabParam, selectedProjectId, currentTab, setSearchParams]);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [hasOpenedBlueprint, setHasOpenedBlueprint] = useState(false);
  const [hasOpenedDocuments, setHasOpenedDocuments] = useState(false);

  useEffect(() => {
    if (currentTab === 'blueprint') setHasOpenedBlueprint(true);
    if (currentTab === 'documents') setHasOpenedDocuments(true);
  }, [currentTab]);

  const mutateQuery = useMutateQueryResource();
  const graphqlService = useService(GraphQLService);

  // --- SHARE & PASSWORD-PROTECTION FLOW ---
  const rawShareKeyParam = searchParams.get('shareKey') || searchParams.get('share_key') || searchParams.get('share') || '';
  const isShareMode = !!rawShareKeyParam;
  const storedShareKey = typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-key') : null;
  const shareKeyParam = rawShareKeyParam || (isShareMode ? (storedShareKey || '') : '');

  const sharedProjectId = useMemo(() => {
    if (!shareKeyParam) return null;
    try {
      const [data] = shareKeyParam.split(',');
      const parts = data.split(':');
      return parts[1] || null;
    } catch (e) {
      return null;
    }
  }, [shareKeyParam]);

  const [isLocked, setIsLocked] = useState(() => {
    if (!isShareMode) return false;
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-key') : null;
    const storedPass = typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-password') : null;
    return !(storedKey && storedPass);
  });

  useEffect(() => {
    if (isShareMode) {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-key') : null;
      const storedPass = typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-password') : null;
      if (storedKey && storedPass) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    } else {
      setIsLocked(false);
    }
  }, [isShareMode]);

  const [isVerifying, setIsVerifying] = useState(false);

  // --- OTP VERIFICATION FLOW STATES ---
  const [guestEmail, setGuestEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');

  const callGraphQL = async (queryObj: any, variables: Record<string, any>) => {
    const queryStr = typeof queryObj === 'string' ? queryObj : queryObj?.query || '';
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: queryStr,
        variables,
      }),
    });
    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || 'GraphQL error');
    }
    return json.data;
  };

  const handleSendOtp = async (emailVal: string) => {
    const trimmedEmail = emailVal.trim();
    if (!trimmedEmail) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    setIsVerifying(true);
    setOtpError('');
    try {
      await callGraphQL(sendProjectShareGuestOtpMutation, {
        workspaceId,
        email: trimmedEmail,
      });
      setGuestEmail(trimmedEmail);
      setOtpSent(true);
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      setGuestEmail(trimmedEmail);
      setOtpSent(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const lastFailedKeyRef = useRef<string | null>(null);

  const handleVerifyOtp = async (otpVal: string) => {
    const trimmedOtp = otpVal.trim();
    if (!trimmedOtp) {
      setOtpError('Please enter the verification code.');
      return;
    }
    setIsVerifying(true);
    setOtpError('');
    try {
      const data = await callGraphQL(verifyProjectShareGuestOtpMutation, {
        workspaceId,
        email: guestEmail,
        otp: trimmedOtp,
        projectId: (sharedProjectId && sharedProjectId !== 'all') ? sharedProjectId : null,
      });

      const verifiedShareKey = data?.verifyProjectShareGuestOtp;
      if (!verifiedShareKey) {
        throw new Error('Verification failed. No key returned.');
      }

      localStorage.setItem('affine-project-share-key', verifiedShareKey);
      localStorage.setItem('affine-project-share-password', 'permanentGuestPass123');
      if (guestEmail && guestEmail.includes('@')) {
        localStorage.setItem('intoai_guest_verified_email', guestEmail.trim().toLowerCase());
      }

      // Mark this key in our ref so the error relock effect ignores stale query errors from old session key
      lastFailedKeyRef.current = verifiedShareKey;

      // Update URL search params so browser URL reflects the new key
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (next.has('shareKey')) next.set('shareKey', verifiedShareKey);
        if (next.has('share_key')) next.set('share_key', verifiedShareKey);
        return next;
      }, { replace: true });

      // Invalidate/revalidate the projectsQuery so SWR gets fresh data
      mutateQuery(projectsQuery);

      setOtpError('');
      setIsLocked(false);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setOtpError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-redirect if on list view but shared to a specific project
  useEffect(() => {
    if (isShareMode && sharedProjectId && selectedProjectId !== sharedProjectId) {
      setSearchParams({ project: sharedProjectId, tab: currentTab, shareKey: shareKeyParam });
    }
  }, [isShareMode, sharedProjectId, selectedProjectId, setSearchParams, currentTab, shareKeyParam]);

  // Share modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalProjectId, setShareModalProjectId] = useState<string | null>(null);
  const [generatedShareLink, setGeneratedShareLink] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Lock screen interactive styling states
  const [isSendHovered, setIsSendHovered] = useState(false);
  const [isVerifyHovered, setIsVerifyHovered] = useState(false);
  const [isChangeHovered, setIsChangeHovered] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  const handleOpenShareModal = async (projectId: string | null) => {
    setIsShareModalOpen(true);
    setShareModalProjectId(projectId);
    setGeneratedShareLink('');
    setIsGeneratingKey(true);

    try {
      const res = await graphqlService.gql({
        query: getOrCreateProjectShareKeyQuery,
        variables: {
          workspaceId,
          projectId: projectId || null,
        },
      });

      const shareKey = (res as any).getOrCreateProjectShareKey;
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?shareKey=${encodeURIComponent(shareKey)}`;
      setGeneratedShareLink(shareUrl);
    } catch (err) {
      console.error('Failed to get or create share key:', err);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedShareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const renderShareModal = () => {
    if (!isShareModalOpen) return null;
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className={styles.modalOverlay} onClick={() => setIsShareModalOpen(false)}>
        <div className={styles.modal} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle} style={{ fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: '15px' }}>
              {shareModalProjectId ? 'Share Project' : 'Share Projects Space'}
            </h3>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setIsShareModalOpen(false)}
            >
              <CloseIconSvg />
            </button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontFamily: 'IBM Plex Sans', fontSize: '13px', lineHeight: 1.5, color: cssVar('textSecondaryColor') }}>
              Generate a permanent secure guest access link to this {shareModalProjectId ? 'project' : 'workspace\'s projects'}. Guests will be verified using their email address via a secure one-time passcode (OTP).
            </p>
            
            {isGeneratingKey ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '32px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: `3px solid ${cssVar('borderColor')}`,
                  borderTopColor: cssVar('primaryColor'),
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ fontFamily: 'IBM Plex Sans', fontSize: '12px', color: cssVar('textSecondaryColor') }}>Generating credentials...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Link Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontFamily: 'IBM Plex Sans', fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Guest View Link
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      fontFamily: 'monospace',
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
                        backgroundColor: copiedLink ? '#10b981' : cssVar('primaryColor'),
                        color: '#ffffff',
                        border: 'none',
                        padding: '0 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        minWidth: '90px',
                        cursor: 'pointer',
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
          <div className={styles.modalFooter} style={{ padding: '16px 24px', borderTop: `1px solid ${cssVar('borderColor')}`, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setIsShareModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const spinKeyframesStyle = (
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `}</style>
  );

  const renderLockScreen = () => {
    const fonts = '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(244, 244, 246, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: fonts,
        color: '#161616',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          borderRadius: '16px',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.05), 0 0 40px rgba(15, 98, 254, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '24px',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src={companyProfile.oneLogoData || companyProfile.logoSrc || oneLogoLight}
              alt="Product Logo"
              style={{
                height: '78px',
                maxHeight: '96px',
                width: 'auto',
                objectFit: 'contain',
              }}
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>

          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#161616', fontFamily: fonts }}>
              Verify Access
            </h2>
            {!otpSent && (
              <p style={{ fontSize: '14px', color: '#525252', margin: 0, lineHeight: 1.5, fontFamily: fonts }}>
                This projects workspace is secure. Enter your email to access.
              </p>
            )}
          </div>

          {!otpSent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const emailInput = e.currentTarget.elements.namedItem('guestEmailInput') as HTMLInputElement;
                if (emailInput) {
                  handleSendOtp(emailInput.value.trim());
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  name="guestEmailInput"
                  required
                  autoFocus
                  placeholder="Enter email (e.g. client@example.com)"
                  disabled={isVerifying}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isEmailFocused ? '1px solid #0f62fe' : '1px solid #c6c6c6',
                    background: '#f4f4f4',
                    color: '#161616',
                    fontSize: '14px',
                    fontFamily: fonts,
                    outline: 'none',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    boxShadow: isEmailFocused ? '0 0 0 2px rgba(15, 98, 254, 0.25)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                  }}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                />
              </div>

              {otpError && (
                <div style={{ fontSize: '13px', color: '#da1e28', fontWeight: 500, textAlign: 'left', fontFamily: fonts }}>
                  {otpError}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                onMouseEnter={() => setIsSendHovered(true)}
                onMouseLeave={() => setIsSendHovered(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: isSendHovered ? '#0043ce' : '#0f62fe',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  fontFamily: fonts,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isVerifying ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.25)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <span>Send Verification Code</span>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const otpInput = e.currentTarget.elements.namedItem('guestOtpInput') as HTMLInputElement;
                if (otpInput) {
                  handleVerifyOtp(otpInput.value.trim());
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#525252', lineHeight: 1.5, fontFamily: fonts, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Verifying access for <strong style={{ color: '#161616' }}>{guestEmail}</strong></span>
                  <span style={{ fontWeight: 600, color: '#161616', marginTop: '8px' }}>Enter 6-digit OTP code</span>
                  <span style={{ fontSize: '12.5px', color: '#6f6f6f', marginTop: '4px' }}>If your email exists in our records, you will receive a verification code (OTP) shortly.</span>
                </div>
                <input
                  type="text"
                  name="guestOtpInput"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="Enter 6-digit OTP code"
                  disabled={isVerifying}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isOtpFocused ? '1px solid #0f62fe' : '1px solid #c6c6c6',
                    background: '#f4f4f4',
                    color: '#161616',
                    fontSize: '16px',
                    fontWeight: 600,
                    letterSpacing: '6px',
                    fontFamily: fonts,
                    outline: 'none',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    boxShadow: isOtpFocused ? '0 0 0 2px rgba(15, 98, 254, 0.25)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                  }}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                />
              </div>

              {otpError && (
                <div style={{ fontSize: '13px', color: '#da1e28', fontWeight: 500, textAlign: 'left', fontFamily: fonts }}>
                  {otpError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onMouseEnter={() => setIsChangeHovered(true)}
                  onMouseLeave={() => setIsChangeHovered(false)}
                  onClick={() => {
                    setOtpSent(false);
                    setOtpError('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: isChangeHovered ? 'rgba(15, 98, 254, 0.08)' : 'transparent',
                    color: '#0f62fe',
                    border: '1px solid #0f62fe',
                    fontWeight: 600,
                    fontSize: '13px',
                    fontFamily: fonts,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Change Email
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  onMouseEnter={() => setIsVerifyHovered(true)}
                  onMouseLeave={() => setIsVerifyHovered(false)}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '8px',
                    background: isVerifyHovered ? '#0043ce' : '#0f62fe',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    fontFamily: fonts,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {isVerifying ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.25)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Code</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // --- QUERY HOOKS ---
  const { data: projectsData, error: projectsError, isLoading: projectsLoading } = useQuery(
    isLocked
      ? undefined
      : {
          query: projectsQuery,
          variables: { workspaceId },
        },
    { suspense: false }
  );

  // Reset lastFailedKeyRef when query successfully loads data without error
  useEffect(() => {
    if (projectsData && !projectsError) {
      lastFailedKeyRef.current = null;
    }
  }, [projectsData, projectsError]);

  // Relock if any main query throws authorization errors
  useEffect(() => {
    if (isShareMode && (projectsError?.message?.includes('Access denied') || projectsError?.message?.includes('Unauthorized'))) {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-key') : null;
      if (storedKey && lastFailedKeyRef.current === storedKey) {
        return;
      }
      if (storedKey) {
        lastFailedKeyRef.current = storedKey;
      }
      localStorage.removeItem('affine-project-share-key');
      localStorage.removeItem('affine-project-share-password');
      setIsLocked(true);
      setOtpError('Your session has expired or is invalid. Please verify your email again.');
    }
  }, [isShareMode, projectsError]);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectSortBy, setProjectSortBy] = useState<'createdAt' | 'progress'>('createdAt');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'Planning' | 'Active' | 'Maintenance' | 'Completed'>('all');

  // Research Domains (Categories) from CollectionService
  const collectionService = useService(CollectionService);
  const collections = useLiveData(collectionService.collections$);

  const projects = projectsData?.projects || [];

  const customCategories = useMemo(() => {
    const domainNames = (collections || []).map(c => c.name).filter(Boolean);
    const projectCats = projects
      .map((p: any) => p.category)
      .filter((cat: string | null | undefined): cat is string => Boolean(cat && cat.trim() && !domainNames.includes(cat.trim())));
    return Array.from(new Set([...domainNames, ...projectCats]));
  }, [collections, projects]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const menuDropdownRef = useRef<HTMLDivElement | null>(null);
  const [categoryMenuPos, setCategoryMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateCategoryMenuPos = useCallback(() => {
    if (categoryMenuRef.current) {
      const rect = categoryMenuRef.current.getBoundingClientRect();
      setCategoryMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  useEffect(() => {
    if (!isCategoryMenuOpen) return;
    updateCategoryMenuPos();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        categoryMenuRef.current && !categoryMenuRef.current.contains(target) &&
        menuDropdownRef.current && !menuDropdownRef.current.contains(target)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      updateCategoryMenuPos();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isCategoryMenuOpen, updateCategoryMenuPos]);

  const getCategoryProjectCount = useCallback((catName: string) => {
    if (catName === 'All') return projects.length;
    return projects.filter((p: any) => (p.category || 'Unassigned') === catName).length;
  }, [projects]);

  const getProjectProgressValue = (status: string) => {
    switch (status) {
      case 'Completed': return 100;
      case 'Maintenance': return 75;
      case 'Active': return 40;
      case 'Planning': return 15;
      default: return 0;
    }
  };

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter((p: any) => (p.category || 'Unassigned') === selectedCategory);
    }
    if (projectStatusFilter !== 'all') {
      result = result.filter((p: any) => p.status === projectStatusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a: any, b: any) => {
      if (projectSortBy === 'progress') {
        const progressA = getProjectProgressValue(a.status);
        const progressB = getProjectProgressValue(b.status);
        if (progressB !== progressA) {
          return progressB - progressA;
        }
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [projects, selectedCategory, searchQuery, projectSortBy, projectStatusFilter]);

  const { data: currentProjectData, isLoading: currentProjectLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectQuery,
          variables: { workspaceId, id: selectedProjectId },
        },
    { suspense: false }
  );
  const currentProjectFromQuery = currentProjectData?.project;
  const currentProject = currentProjectFromQuery || projects.find((p: any) => p.id === selectedProjectId);

  useEffect(() => {
    if (currentProject) {
      setDescInput(currentProject.description || '');
    }
  }, [currentProject]);

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectAnalyticsQuery,
          variables: { workspaceId, projectId: selectedProjectId },
        },
    { suspense: false }
  );
  const analytics = analyticsData?.projectAnalytics;

  const { data: modulesData, isLoading: modulesLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectModulesQuery,
          variables: { workspaceId, projectId: selectedProjectId },
        },
    { suspense: false }
  );
  const modules = modulesData?.projectModules || [];

  const { data: cyclesData, isLoading: cyclesLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectCyclesQuery,
          variables: { workspaceId, projectId: selectedProjectId },
        },
    { suspense: false }
  );
  const cycles = cyclesData?.projectCycles || [];

  const { data: releasesData, isLoading: releasesLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectReleasesQuery,
          variables: { workspaceId, projectId: selectedProjectId },
        },
    { suspense: false }
  );
  const releases = releasesData?.projectReleases || [];

  const { data: configData, isLoading: configLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectDocsConfigQuery,
          variables: { workspaceId, projectId: selectedProjectId },
        },
    { suspense: false }
  );
  const config = configData?.projectDocsConfig;

  const visibleTabs = useMemo(() => {
    return ['overview', 'board', 'issues', 'cycles', 'releases', 'modules', 'documents', 'blueprint', 'analytics'];
  }, []);

  const tabRadioItems = useMemo<RadioItem[]>(() => {
    return visibleTabs.map(tab => ({
      value: tab,
      label: tab === 'issues' 
        ? 'Work Items ( List )' 
        : tab === 'board' 
          ? 'Work Items ( Board )' 
          : tab.charAt(0).toUpperCase() + tab.slice(1),
      testId: `project-tab-${tab}`,
    }));
  }, [visibleTabs]);

  // Filter state for Issues tab
  const [issueSearch, setIssueSearch] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState('');
  const [issuePriorityFilter, setIssuePriorityFilter] = useState('');
  const [issueStatusFilter, setIssueStatusFilter] = useState('');
  const [issueSortBy, setIssueSortBy] = useState('createdAt');
  const [issueSortOrder, setIssueSortOrder] = useState<'asc' | 'desc'>('desc');

  const issuesFilterInput = useMemo(() => {
    const filter: any = { projectId: selectedProjectId };
    if (issueTypeFilter) filter.type = [issueTypeFilter];
    if (issuePriorityFilter) filter.priority = [issuePriorityFilter];
    if (issueStatusFilter) filter.status = [issueStatusFilter];
    if (issueSearch) filter.search = issueSearch;
    filter.sortBy = issueSortBy;
    filter.sortOrder = issueSortOrder;
    return filter;
  }, [selectedProjectId, issueTypeFilter, issuePriorityFilter, issueStatusFilter, issueSearch, issueSortBy, issueSortOrder]);

  const { data: issuesData, isLoading: issuesLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectIssuesQuery,
          variables: { workspaceId, filter: issuesFilterInput },
        },
    { refreshInterval: 3000, suspense: false }
  );
  const swrIssues = issuesData?.projectIssues || [];
  const [optimisticIssues, setOptimisticIssues] = useState<any[] | null>(null);

  useEffect(() => {
    setOptimisticIssues(null);
  }, [issuesData?.projectIssues]);

  const issues = optimisticIssues !== null ? optimisticIssues : swrIssues;

  const { data: docsData, isLoading: docsLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectDocumentsQuery,
          variables: { workspaceId, projectId: selectedProjectId, releaseId: searchParams.get('releaseId') || '' },
        },
    { suspense: false }
  );

  const blueprintDoc = useMemo(() => {
    return docsData?.projectDocuments?.find((d: any) => d.type === 'ProjectBlueprint');
  }, [docsData]);

  const blueprintIssueIds = useMemo(() => {
    if (!blueprintDoc || !blueprintDoc.content) return new Set<string>();
    try {
      const parsed = JSON.parse(blueprintDoc.content);
      const ids = new Set<string>();
      if (parsed.elements && Array.isArray(parsed.elements)) {
        for (const el of parsed.elements) {
          if (el.issueId) {
            ids.add(el.issueId);
          }
        }
      }
      return ids;
    } catch (e) {
      console.error('Failed to parse blueprint content in board view:', e);
      return new Set<string>();
    }
  }, [blueprintDoc]);

  const isIssueFromBlueprint = useCallback((issue: any) => {
    if (!issue) return false;
    if (issue.description?.toLowerCase().includes('blueprint')) return true;
    if (blueprintIssueIds.has(issue.id)) return true;
    return false;
  }, [blueprintIssueIds]);

  const { data: membersData, isLoading: membersLoading } = useQuery(
    isLocked || isShareMode
      ? undefined
      : {
          query: getMembersByWorkspaceIdQuery,
          variables: { workspaceId },
        },
    { suspense: false }
  );
  const workspaceMembers = membersData?.workspace?.members || [];


  // Auto-initialize releaseId in searchParams once releases load to enable SWR query caching
  useEffect(() => {
    if (selectedProjectId && releases && releases.length > 0) {
      const currentReleaseId = searchParams.get('releaseId');
      if (!currentReleaseId) {
        const sorted = [...releases].sort((a: any, b: any) => {
          if (a.plannedDate && b.plannedDate) {
            return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
          }
          return 0;
        });
        if (sorted.length > 0) {
          setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('releaseId', sorted[0].id);
            return next;
          }, { replace: true });
        }
      }
    }
  }, [selectedProjectId, releases, searchParams, setSearchParams]);

  const { data: labelsData, isLoading: labelsLoading } = useQuery(
    isLocked || !selectedProjectId
      ? undefined
      : {
          query: projectLabelsQuery,
          variables: { workspaceId, projectId: selectedProjectId },
        },
    { suspense: false }
  );
  const labels = labelsData?.projectLabels || [];

  // --- MUTATIONS ---
  const { trigger: triggerCreateProject } = useMutation({ mutation: createProjectMutation });
  const { trigger: triggerUpdateProject } = useMutation({ mutation: updateProjectMutation });
  const { trigger: triggerDeleteProject } = useMutation({ mutation: deleteProjectMutation });

  const { trigger: triggerCreateIssue } = useMutation({ mutation: createProjectIssueMutation });
  const { trigger: triggerUpdateIssue } = useMutation({ mutation: updateProjectIssueMutation });
  const { trigger: triggerDeleteIssue } = useMutation({ mutation: deleteProjectIssueMutation });

  const { trigger: triggerCreateCycle } = useMutation({ mutation: createProjectCycleMutation });
  const { trigger: triggerUpdateCycle } = useMutation({ mutation: updateProjectCycleMutation });
  const { trigger: triggerDeleteCycle } = useMutation({ mutation: deleteProjectCycleMutation });

  const { trigger: triggerCreateRelease } = useMutation({ mutation: createProjectReleaseMutation });
  const { trigger: triggerUpdateRelease } = useMutation({ mutation: updateProjectReleaseMutation });
  const { trigger: triggerDeleteRelease } = useMutation({ mutation: deleteProjectReleaseMutation });

  const { trigger: triggerCreateModule } = useMutation({ mutation: createProjectModuleMutation });
  const { trigger: triggerUpdateModule } = useMutation({ mutation: updateProjectModuleMutation });
  const { trigger: triggerDeleteModule } = useMutation({ mutation: deleteProjectModuleMutation });

  const { trigger: triggerCreateLabel } = useMutation({ mutation: createProjectLabelMutation });
  const { trigger: triggerDeleteLabel } = useMutation({ mutation: deleteProjectLabelMutation });

  const { trigger: triggerCreateComment } = useMutation({ mutation: createProjectIssueCommentMutation });
  const { trigger: triggerDeleteComment } = useMutation({ mutation: deleteProjectIssueCommentMutation });

  // --- COPILOT STATES & HOOKS ---
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({
    Backlog: 30,
    Todo: 30,
    InProgress: 30,
    InReview: 30,
    Testing: 30,
    Done: 30,
  });

  const handleLoadMore = useCallback((statusName: string, currentLoaded: number, totalAvailable: number) => {
    if (currentLoaded >= totalAvailable) return;
    setTimeout(() => {
      setVisibleLimits(prev => {
        const currentLimit = prev[statusName] || 30;
        if (currentLimit >= totalAvailable) return prev;
        return {
          ...prev,
          [statusName]: currentLimit + 30,
        };
      });
    }, 0);
  }, []);
  const { data: userData } = useQuery(
    isLocked || isShareMode
      ? undefined
      : { query: getCurrentUserQuery },
    { suspense: false }
  );
  const currentUser = userData?.currentUser;

  const { data: geminiSettingsData } = useQuery(
    isLocked || isShareMode
      ? undefined
      : {
          query: workspaceGeminiSettingQuery,
          variables: { workspaceId },
        },
    { suspense: false }
  );
  const geminiSettings = geminiSettingsData?.workspaceGeminiSetting;

  const workspaceDialogService = useService(WorkspaceDialogService);

  const [draggedOverCardId, setDraggedOverCardId] = useState<string | null>(null);
  const [dragTargetStatus, setDragTargetStatus] = useState<string | null>(null);

  // Determine current user privilege level
  const currentUserMember = workspaceMembers.find((m: any) => m.id === currentUser?.id);
  const isAdmin = currentUserMember?.permission === 'Owner' || currentUserMember?.permission === 'Admin';

  const executeAction = async (action: string, data: any) => {
    try {
      if (action === 'CREATE_WORK_ITEM' || action === 'CREATE_ISSUE') {
        const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
        if (!projectId) {
          throw new Error('No active project. Please create or select a project first.');
        }

        const assignee = data.assigneeName ? workspaceMembers.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.assigneeName.toLowerCase())) : null;
        const cycle = data.cycleName ? cycles.find(c => c.name.toLowerCase().includes(data.cycleName.toLowerCase())) : null;
        const mo = data.moduleName ? modules.find(m => m.name.toLowerCase().includes(data.moduleName.toLowerCase())) : null;
        const re = data.releaseName ? releases.find(r => r.name.toLowerCase().includes(data.releaseName.toLowerCase())) : null;

        if (cycle && cycle.status === 'Completed') {
          await triggerUpdateCycle({ workspaceId, id: cycle.id, status: 'Active' });
          mutateQuery(projectCyclesQuery);
        }

        await triggerCreateIssue({
          workspaceId,
          input: {
            projectId,
            title: data.title,
            description: data.description || '',
            type: data.type || 'Task',
            priority: data.priority || 'Medium',
            status: data.status || 'Todo',
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
            estimatedTime: Number(data.estimatedTime) || 1,
            cycleId: cycle?.id || undefined,
            moduleId: mo?.id || undefined,
            releaseId: re?.id || undefined,
            assigneeIds: assignee ? [assignee.id] : [],
          },
        });

        mutateQuery(projectIssuesQuery);
        if (analytics) mutateQuery(projectAnalyticsQuery);
      } else if (action === 'UPDATE_WORK_ITEM' || action === 'UPDATE_ISSUE') {
        const searchTitle = data.issueTitle || data.title || '';
        const issue = issues.find(i => i.title.toLowerCase().includes(searchTitle.toLowerCase()));
        if (!issue) {
          throw new Error(`Could not find a work item with title containing "${searchTitle}".`);
        }

        const assignee = data.assigneeName ? workspaceMembers.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.assigneeName.toLowerCase())) : null;
        const cycle = data.cycleName ? cycles.find(c => c.name.toLowerCase().includes(data.cycleName.toLowerCase())) : null;
        const mo = data.moduleName ? modules.find(m => m.name.toLowerCase().includes(data.moduleName.toLowerCase())) : null;
        const re = data.releaseName ? releases.find(r => r.name.toLowerCase().includes(data.releaseName.toLowerCase())) : null;

        if (cycle && cycle.status === 'Completed') {
          await triggerUpdateCycle({ workspaceId, id: cycle.id, status: 'Active' });
          mutateQuery(projectCyclesQuery);
        }

        const updateInput: any = {};
        if (data.newTitle) updateInput.title = data.newTitle;
        if (data.description !== undefined) updateInput.description = data.description;
        if (data.type) updateInput.type = data.type;
        if (data.priority) updateInput.priority = data.priority;
        if (data.status) updateInput.status = data.status;
        if (data.dueDate) updateInput.dueDate = new Date(data.dueDate).toISOString();
        if (data.estimatedTime) updateInput.estimatedTime = Number(data.estimatedTime);
        if (cycle) updateInput.cycleId = cycle.id;
        if (mo) updateInput.moduleId = mo.id;
        if (re) updateInput.releaseId = re.id;
        if (assignee) updateInput.assigneeIds = [assignee.id];

        await triggerUpdateIssue({
          workspaceId,
          id: issue.id,
          input: updateInput,
        });

        mutateQuery(projectIssuesQuery);
        mutateQuery(projectIssueQuery);
        if (analytics) mutateQuery(projectAnalyticsQuery);
      } else if (action === 'DELETE_WORK_ITEM' || action === 'DELETE_ISSUE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot delete resources.');
        }
        const searchTitle = data.issueTitle || data.title || '';
        const issue = issues.find(i => i.title.toLowerCase().includes(searchTitle.toLowerCase()));
        if (!issue) {
          throw new Error(`Could not find a work item with title containing "${searchTitle}".`);
        }

        await triggerDeleteIssue({ workspaceId, id: issue.id });

        mutateQuery(projectIssuesQuery);
        if (analytics) mutateQuery(projectAnalyticsQuery);
      } else if (action === 'CREATE_PROJECT') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot create projects.');
        }
        const pm = data.projectManagerName
          ? workspaceMembers.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.projectManagerName.toLowerCase()))
          : currentUser;
        
        const visRaw = String(data.visibility || '').toLowerCase();
        const isRestricted = (visRaw === 'restricted' || visRaw === 'private') && !visRaw.includes('unrestricted');
        const visibilityValue = isRestricted ? 'Restricted' : 'WorkspaceWide';

        await triggerCreateProject({
          workspaceId,
          input: {
            name: data.name,
            description: data.description || '',
            status: data.status || 'Active',
            visibility: visibilityValue,
            color: data.color || '#3b82f6',
            category: data.category || '',
            restrictedMembers: isRestricted ? (data.restrictedMembers || []) : [],
            projectManagerId: pm?.id || currentUser?.id || undefined,
            projectManagerName: pm?.name || currentUser?.name || undefined,
          },
        });
        mutateQuery(projectsQuery);
      } else if (action === 'UPDATE_PROJECT') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot edit projects.');
        }
        const projectId = data.projectId || selectedProjectId || (projects.length > 0 ? projects[0].id : '');
        if (!projectId) {
          throw new Error('No project selected to update.');
        }
        const updateVisRaw = data.visibility ? String(data.visibility).toLowerCase() : undefined;
        const updateVisValue = updateVisRaw
          ? ((updateVisRaw === 'restricted' || updateVisRaw === 'private') && !updateVisRaw.includes('unrestricted') ? 'Restricted' : 'WorkspaceWide')
          : undefined;

        await triggerUpdateProject({
          workspaceId,
          id: projectId,
          input: {
            name: data.name,
            description: data.description,
            visibility: updateVisValue,
            color: data.color,
          },
        });
        mutateQuery(projectsQuery);
      } else if (action === 'DELETE_PROJECT') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot delete projects.');
        }
        const projectId = data.projectId || selectedProjectId || (projects.length > 0 ? projects[0].id : '');
        if (!projectId) {
          throw new Error('No project selected to delete.');
        }
        await triggerDeleteProject({ workspaceId, id: projectId });
        mutateQuery(projectsQuery);
      } else if (action === 'CREATE_CYCLE') {
        const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
        if (!projectId) {
          throw new Error('No active project. Please create/select a project first.');
        }

        await triggerCreateCycle({
          workspaceId,
          projectId,
          name: data.name,
          goal: data.goal || '',
          status: data.status || 'Planned',
          startDate: new Date(data.startDate || Date.now()).toISOString(),
          endDate: new Date(data.endDate || Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

        mutateQuery(projectCyclesQuery);
      } else if (action === 'UPDATE_CYCLE') {
        const cycle = cycles.find(c => (data.cycleId && c.id === data.cycleId) || (data.name && c.name.toLowerCase().includes(data.name.toLowerCase())));
        if (!cycle) {
          throw new Error('Could not find cycle to update.');
        }
        await triggerUpdateCycle({
          workspaceId,
          id: cycle.id,
          name: data.newName || data.name,
          goal: data.goal,
          status: data.status,
          startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
          endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        });
        mutateQuery(projectCyclesQuery);
      } else if (action === 'DELETE_CYCLE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot delete cycles.');
        }
        const cycle = cycles.find(c => (data.cycleId && c.id === data.cycleId) || (data.name && c.name.toLowerCase().includes(data.name.toLowerCase())));
        if (!cycle) {
          throw new Error('Could not find cycle to delete.');
        }
        await triggerDeleteCycle({ workspaceId, id: cycle.id });
        mutateQuery(projectCyclesQuery);
      } else if (action === 'CREATE_RELEASE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot create versions.');
        }
        const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
        if (!projectId) {
          throw new Error('No active project. Please create/select a project first.');
        }

        await triggerCreateRelease({
          workspaceId,
          projectId,
          name: data.name,
          description: data.description || '',
          status: data.status || 'Planned',
          plannedDate: data.plannedDate ? new Date(data.plannedDate).toISOString() : undefined,
          checklist: {},
        });

        mutateQuery(projectReleasesQuery);
      } else if (action === 'UPDATE_RELEASE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot update versions.');
        }
        const release = releases.find(r => (data.releaseId && r.id === data.releaseId) || (data.name && r.name.toLowerCase().includes(data.name.toLowerCase())));
        if (!release) {
          throw new Error('Could not find release to update.');
        }
        await triggerUpdateRelease({
          workspaceId,
          id: release.id,
          name: data.newName || data.name,
          description: data.description,
          status: data.status,
          plannedDate: data.plannedDate ? new Date(data.plannedDate).toISOString() : undefined,
        });
        mutateQuery(projectReleasesQuery);
      } else if (action === 'DELETE_RELEASE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot delete versions.');
        }
        const release = releases.find(r => (data.releaseId && r.id === data.releaseId) || (data.name && r.name.toLowerCase().includes(data.name.toLowerCase())));
        if (!release) {
          throw new Error('Could not find release to delete.');
        }
        await triggerDeleteRelease({ workspaceId, id: release.id });
        mutateQuery(projectReleasesQuery);
      } else if (action === 'CREATE_MODULE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot create system modules.');
        }
        const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
        if (!projectId) {
          throw new Error('No active project. Please create/select a project first.');
        }

        const lead = data.leadName ? workspaceMembers.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.leadName.toLowerCase())) : null;

        await triggerCreateModule({
          workspaceId,
          projectId,
          name: data.name,
          description: data.description || '',
          leadId: lead?.id || undefined,
        });

        mutateQuery(projectModulesQuery);
      } else if (action === 'UPDATE_MODULE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot update system modules.');
        }
        const mo = modules.find(m => (data.moduleId && m.id === data.moduleId) || (data.name && m.name.toLowerCase().includes(data.name.toLowerCase())));
        if (!mo) {
          throw new Error('Could not find module to update.');
        }
        const lead = data.leadName ? workspaceMembers.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.leadName.toLowerCase())) : undefined;
        await triggerUpdateModule({
          workspaceId,
          id: mo.id,
          name: data.newName || data.name,
          description: data.description,
          leadId: lead ? lead.id : undefined,
        });
        mutateQuery(projectModulesQuery);
      } else if (action === 'DELETE_MODULE') {
        if (!isAdmin) {
          throw new Error('Action blocked: Standard workspace members cannot delete system modules.');
        }
        const mo = modules.find(m => (data.moduleId && m.id === data.moduleId) || (data.name && m.name.toLowerCase().includes(data.name.toLowerCase())));
        if (!mo) {
          throw new Error('Could not find module to delete.');
        }
        await triggerDeleteModule({ workspaceId, id: mo.id });
        mutateQuery(projectModulesQuery);
      } else if (action === 'UPDATE_BLUEPRINT') {
        window.dispatchEvent(new CustomEvent('workspace-copilot-blueprint-action', { detail: data }));
      } else if (action === 'EDIT_DOCUMENT') {
        window.dispatchEvent(new CustomEvent('workspace-copilot-doc-edit', { detail: data }));
      } else {
        throw new Error(`Action "${action}" is not supported.`);
      }
    } catch (e: any) {
      console.error('Execute action failed:', e);
      throw e;
    }
  };

  useProjectCopilotSync({
    selectedProjectId,
    searchParams,
    projects,
    workspaceMembers,
    cycles,
    modules,
    releases,
    issues,
    categories: customCategories,
    onExecuteAction: executeAction,
  });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    category: '',
    status: 'Active',
    visibility: 'WorkspaceWide',
    restrictedMembers: [] as string[],
    projectManagerId: '',
    projectManagerName: '',
  });

  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectForm({
      name: '',
      description: '',
      color: '#0f62fe',
      category: '',
      status: 'Active',
      visibility: 'WorkspaceWide',
      restrictedMembers: [],
      projectManagerId: '',
      projectManagerName: '',
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: any) => {
    setEditingProject(proj);
    setProjectForm({
      name: proj.name || '',
      description: proj.description || '',
      color: proj.color || '#0f62fe',
      category: proj.category || '',
      status: proj.status || 'Active',
      visibility: proj.visibility || 'WorkspaceWide',
      restrictedMembers: proj.restrictedMembers?.map((m: any) => m.userId || m.user?.id) || [],
      projectManagerId: proj.projectManagerId || '',
      projectManagerName: proj.projectManagerName || '',
    });
    setIsProjectModalOpen(true);
  };

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedIssueIdForView, setSelectedIssueIdForView] = useState('');
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    type: 'Task',
    priority: 'Medium',
    status: 'Todo',
    dueDate: '',
    estimatedTime: 0,
    cycleId: '',
    moduleId: '',
    releaseId: '',
    assigneeIds: [] as string[],
    parentIssueId: '',
  });

  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    status: 'Planned',
  });

  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    name: '',
    description: '',
    plannedDate: '',
    status: 'Planned',
  });
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);

  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    name: '',
    description: '',
    leadId: '',
  });

  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (id?: string) => void | Promise<void>;
    targetId?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [editIssueForm, setEditIssueForm] = useState({
    title: '',
    description: '',
    type: 'Task',
    priority: 'Medium',
    status: 'Todo',
    dueDate: '',
    estimatedTime: 0,
    cycleId: '',
    moduleId: '',
    releaseId: '',
    assigneeIds: [] as string[],
  });

  // Issue View Details / Comments fetch
  const { data: issueDetailsData } = useQuery(
    isLocked || !selectedIssueIdForView
      ? undefined
      : {
          query: projectIssueQuery,
          variables: { workspaceId, id: selectedIssueIdForView },
        },
    { suspense: false }
  );
  const issueDetails = issueDetailsData?.projectIssue;

  useEffect(() => {
    if (issueDetails) {
      setEditIssueForm({
        title: issueDetails.title || '',
        description: issueDetails.description || '',
        type: issueDetails.type || 'Task',
        priority: issueDetails.priority || 'Medium',
        status: issueDetails.status || 'Todo',
        dueDate: issueDetails.dueDate ? new Date(issueDetails.dueDate).toISOString().split('T')[0] : '',
        estimatedTime: issueDetails.estimatedTime || 0,
        cycleId: issueDetails.cycleId || '',
        moduleId: issueDetails.moduleId || '',
        releaseId: issueDetails.releaseId || '',
        assigneeIds: (issueDetails.assignees || []).map((a: any) => a.userId),
      });
    }
  }, [issueDetails]);

  const { data: commentsData } = useQuery(
    isLocked || !selectedIssueIdForView
      ? undefined
      : {
          query: projectIssueCommentsQuery,
          variables: { workspaceId, issueId: selectedIssueIdForView },
        },
    { suspense: false }
  );
  const comments = commentsData?.projectIssueComments || [];
  const [newCommentContent, setNewCommentContent] = useState('');

  // --- HANDLERS ---
  const handleSelectProject = (projectId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`affine_active_project_${workspaceId}`, projectId);
      localStorage.setItem(`affine_active_tab_${workspaceId}`, 'overview');
    }
    const params: any = { project: projectId, tab: 'overview' };
    if (shareKeyParam) {
      params.shareKey = shareKeyParam;
    }
    setSearchParams(params);
  };

  const handleBackToList = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`affine_active_project_${workspaceId}`);
      localStorage.removeItem(`affine_active_tab_${workspaceId}`);
    }
    const params: any = {};
    if (shareKeyParam) {
      params.shareKey = shareKeyParam;
    }
    setSearchParams(params);
  };

  const handleTabChange = (tabName: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`affine_active_tab_${workspaceId}`, tabName);
    }
    const params: any = { project: selectedProjectId, tab: tabName };
    if (shareKeyParam) {
      params.shareKey = shareKeyParam;
    }
    setSearchParams(params);
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim()) {
      alert('Project Name is required.');
      return;
    }
    if (!projectForm.projectManagerId) {
      alert('Project Manager is mandatory. Please select a project manager for this project.');
      return;
    }
    try {
      if (editingProject) {
        await triggerUpdateProject({
          workspaceId,
          id: editingProject.id,
          input: {
            name: projectForm.name,
            description: projectForm.description,
            color: projectForm.color,
            category: projectForm.category !== undefined ? projectForm.category : '',
            status: projectForm.status,
            visibility: projectForm.visibility,
            restrictedMembers: projectForm.visibility === 'Restricted' ? projectForm.restrictedMembers : [],
            projectManagerId: projectForm.projectManagerId || undefined,
            projectManagerName: projectForm.projectManagerName || undefined,
          },
        });
      } else {
        await triggerCreateProject({
          workspaceId,
          input: {
            name: projectForm.name,
            description: projectForm.description,
            color: projectForm.color,
            category: projectForm.category || undefined,
            status: projectForm.status,
            visibility: projectForm.visibility,
            restrictedMembers: projectForm.visibility === 'Restricted' ? projectForm.restrictedMembers : [],
            projectManagerId: projectForm.projectManagerId || undefined,
            projectManagerName: projectForm.projectManagerName || undefined,
          },
        });
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
      setProjectForm({
        name: '',
        description: '',
        color: '#0f62fe',
        category: '',
        status: 'Active',
        visibility: 'WorkspaceWide',
        restrictedMembers: [],
        projectManagerId: '',
        projectManagerName: '',
      });
      mutateQuery(projectsQuery);
      if (selectedProjectId) {
        mutateQuery(projectQuery);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = (projId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? All associated work items, cycles, modules, and comments will be permanently deleted.',
      onConfirm: async () => {
        try {
          await triggerDeleteProject({ workspaceId, id: projId });
          if (selectedProjectId === projId) {
            handleBackToList();
          }
          mutateQuery(projectsQuery);
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleBoardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!boardContainerRef.current) return;

    const container = boardContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    const threshold = 100;
    const scrollSpeed = 15;

    if (x > width - threshold) {
      container.scrollLeft += scrollSpeed;
    } else if (x < threshold) {
      container.scrollLeft -= scrollSpeed;
    }
  };

  const handleCreateIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // If selected cycle is completed, activate it
      if (issueForm.cycleId) {
        const selectedCyc = cycles.find(c => c.id === issueForm.cycleId);
        if (selectedCyc && selectedCyc.status === 'Completed') {
          await triggerUpdateCycle({ workspaceId, id: selectedCyc.id, status: 'Active' });
          mutateQuery(projectCyclesQuery);
        }
      }
      await triggerCreateIssue({
        workspaceId,
        input: {
          projectId: selectedProjectId,
          title: issueForm.title,
          description: issueForm.description,
          type: issueForm.type,
          priority: issueForm.priority,
          status: issueForm.status,
          dueDate: issueForm.dueDate ? new Date(issueForm.dueDate).toISOString() : undefined,
          estimatedTime: Number(issueForm.estimatedTime) || 0,
          cycleId: issueForm.cycleId || undefined,
          moduleId: issueForm.moduleId || undefined,
          releaseId: issueForm.releaseId || undefined,
          assigneeIds: issueForm.assigneeIds,
          parentIssueId: issueForm.parentIssueId || undefined,
        },
      });
      setIsIssueModalOpen(false);
      setIssueForm({
        title: '',
        description: '',
        type: 'Task',
        priority: 'Medium',
        status: 'Todo',
        dueDate: '',
        estimatedTime: 0,
        cycleId: '',
        moduleId: '',
        releaseId: '',
        assigneeIds: [],
        parentIssueId: '',
      });
      mutateQuery(projectIssuesQuery);
      if (analytics) {
        mutateQuery(projectAnalyticsQuery);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editIssueForm.cycleId) {
        const selectedCyc = cycles.find(c => c.id === editIssueForm.cycleId);
        if (selectedCyc && selectedCyc.status === 'Completed') {
          await triggerUpdateCycle({ workspaceId, id: selectedCyc.id, status: 'Active' });
          mutateQuery(projectCyclesQuery);
        }
      }

      await triggerUpdateIssue({
        workspaceId,
        id: selectedIssueIdForView,
        input: {
          title: editIssueForm.title,
          description: editIssueForm.description,
          type: editIssueForm.type,
          priority: editIssueForm.priority,
          status: editIssueForm.status,
          dueDate: editIssueForm.dueDate ? new Date(editIssueForm.dueDate).toISOString() : null,
          estimatedTime: Number(editIssueForm.estimatedTime) || 0,
          cycleId: editIssueForm.cycleId || null,
          moduleId: editIssueForm.moduleId || null,
          releaseId: editIssueForm.releaseId || null,
          assigneeIds: editIssueForm.assigneeIds,
        } as any,
      });
      setIsEditingIssue(false);
      mutateQuery(projectIssuesQuery);
      mutateQuery(projectIssueQuery);
      if (analytics) {
        mutateQuery(projectAnalyticsQuery);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, newStatus: string) => {
    const baseIssues = optimisticIssues !== null ? optimisticIssues : swrIssues;
    setOptimisticIssues(
      baseIssues.map(iss => (iss.id === issueId ? { ...iss, status: newStatus } : iss))
    );
    try {
      await triggerUpdateIssue({
        workspaceId,
        id: issueId,
        input: { status: newStatus },
      });
      mutateQuery(projectIssuesQuery);
      if (selectedIssueIdForView === issueId) {
        mutateQuery(projectIssueQuery);
      }
    } catch (err) {
      console.error(err);
      setOptimisticIssues(null);
    }
  };

  const handleCreateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCycleId) {
        await triggerUpdateCycle({
          workspaceId,
          id: editingCycleId,
          name: cycleForm.name,
          goal: cycleForm.goal,
          status: cycleForm.status,
          startDate: cycleForm.startDate ? new Date(cycleForm.startDate).toISOString() : undefined,
          endDate: cycleForm.endDate ? new Date(cycleForm.endDate).toISOString() : undefined,
        });
      } else {
        await triggerCreateCycle({
          workspaceId,
          projectId: selectedProjectId,
          name: cycleForm.name,
          goal: cycleForm.goal,
          status: cycleForm.status,
          startDate: cycleForm.startDate ? new Date(cycleForm.startDate).toISOString() : undefined,
          endDate: cycleForm.endDate ? new Date(cycleForm.endDate).toISOString() : undefined,
        });
      }
      setIsCycleModalOpen(false);
      setEditingCycleId(null);
      setCycleForm({
        name: '',
        goal: '',
        startDate: '',
        endDate: '',
        status: 'Planned',
      });
      mutateQuery(projectCyclesQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReleaseId) {
        await triggerUpdateRelease({
          workspaceId,
          id: editingReleaseId,
          name: releaseForm.name,
          description: releaseForm.description,
          status: releaseForm.status,
          plannedDate: releaseForm.plannedDate ? new Date(releaseForm.plannedDate).toISOString() : undefined,
        });
      } else {
        await triggerCreateRelease({
          workspaceId,
          projectId: selectedProjectId,
          name: releaseForm.name,
          description: releaseForm.description,
          status: releaseForm.status,
          plannedDate: releaseForm.plannedDate ? new Date(releaseForm.plannedDate).toISOString() : undefined,
          checklist: {},
        });
      }
      setIsReleaseModalOpen(false);
      setEditingReleaseId(null);
      setReleaseForm({
        name: '',
        description: '',
        plannedDate: '',
        status: 'Planned',
      });
      mutateQuery(projectReleasesQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await triggerCreateModule({
        workspaceId,
        projectId: selectedProjectId,
        name: moduleForm.name,
        description: moduleForm.description,
        leadId: moduleForm.leadId || undefined,
      });
      setIsModuleModalOpen(false);
      setModuleForm({
        name: '',
        description: '',
        leadId: '',
      });
      mutateQuery(projectModulesQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;
    try {
      await triggerCreateComment({
        workspaceId,
        issueId: selectedIssueIdForView,
        content: newCommentContent,
      });
      setNewCommentContent('');
      mutateQuery(projectIssueCommentsQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (release: any, index: number) => {
    try {
      const currentChecklist = Array.isArray(release.checklist) ? [...release.checklist] : [];
      currentChecklist[index] = {
        ...currentChecklist[index],
        done: !currentChecklist[index].done,
      };
      await triggerUpdateRelease({
        workspaceId,
        id: release.id,
        checklist: currentChecklist as any,
      });
      mutateQuery(projectReleasesQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklistItem = async (release: any, text: string) => {
    if (!text.trim()) return;
    try {
      const currentChecklist = Array.isArray(release.checklist) ? [...release.checklist] : [];
      currentChecklist.push({
        id: Math.random().toString(36).substring(7),
        text,
        done: false,
      });
      await triggerUpdateRelease({
        workspaceId,
        id: release.id,
        checklist: currentChecklist as any,
      });
      mutateQuery(projectReleasesQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChecklistItem = async (release: any, index: number) => {
    try {
      const currentChecklist = Array.isArray(release.checklist) ? [...release.checklist] : [];
      currentChecklist.splice(index, 1);
      await triggerUpdateRelease({
        workspaceId,
        id: release.id,
        checklist: currentChecklist as any,
      });
      mutateQuery(projectReleasesQuery);
    } catch (err) {
      console.error(err);
    }
  };

  // --- KANBAN DRAG & DROP IMPLEMENTATION ---
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData('text/plain', issueId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverCardId(null);
    setDragTargetStatus(null);
    const issueId = e.dataTransfer.getData('text/plain');
    if (issueId) {
      await handleUpdateIssueStatus(issueId, targetStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // --- RENDER BURNDOWN SVG CHART ---
  // --- RENDER BURNDOWN SVG CHART ---
  const renderBurndownChart = (cycle: any) => {
    if (!cycle.startDate || !cycle.endDate) {
      return <div className={styles.chartWrapper}>Start and end dates must be configured to generate the burndown chart.</div>;
    }

    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);
    const cycleIssues = issues.filter(issue => issue.cycleId === cycle.id);

    const totalEstimated = cycleIssues.reduce((sum, iss) => sum + (iss.estimatedTime || 1), 0);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate daily data
    const dataPoints: { day: number; dateStr: string; ideal: number; actual: number }[] = [];
    const today = new Date();

    for (let i = 0; i <= totalDays; i++) {
      const currentDayDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const idealRemaining = Math.max(0, totalEstimated - (i * (totalEstimated / totalDays)));

      // Calculate actual remaining by checking completion dates or status
      let completedEstimated = 0;
      cycleIssues.forEach(iss => {
        if (iss.status.toLowerCase() === 'done') {
          const completeDate = iss.dueDate ? new Date(iss.dueDate) : new Date(cycle.startDate);
          if (completeDate <= currentDayDate) {
            completedEstimated += (iss.estimatedTime || 1);
          }
        }
      });
      const actualRemaining = currentDayDate <= today ? Math.max(0, totalEstimated - completedEstimated) : null;

      dataPoints.push({
        day: i,
        dateStr: currentDayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        ideal: idealRemaining,
        actual: actualRemaining !== null ? actualRemaining : 0,
      });
    }

    // Chart Dimensions
    const width = 500;
    const height = 220;
    const padding = 35;

    const getX = (index: number) => padding + (index * (width - 2 * padding) / totalDays);
    const getY = (val: number) => {
      if (totalEstimated === 0) return height - padding;
      return height - padding - (val * (height - 2 * padding) / totalEstimated);
    };

    // Construct SVG paths
    let actualPath = '';
    let fillPath = '';
    let pointsPlotted = 0;

    dataPoints.forEach((pt, index) => {
      const currentDayDate = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
      if (currentDayDate <= today) {
        const x = getX(index);
        const y = getY(pt.actual);
        actualPath += `${pointsPlotted === 0 ? 'M' : 'L'} ${x} ${y}`;
        fillPath += `${pointsPlotted === 0 ? 'M' : 'L'} ${x} ${y}`;
        pointsPlotted++;
      }
    });

    if (pointsPlotted > 0) {
      const lastPlottedIndex = pointsPlotted - 1;
      const lastX = getX(lastPlottedIndex);
      fillPath += ` L ${lastX} ${height - padding} L ${getX(0)} ${height - padding} Z`;
    }

    // Calculate current stats
    const todayPoint = dataPoints.filter(pt => {
      const ptDate = new Date(start.getTime() + pt.day * 24 * 60 * 60 * 1000);
      return ptDate <= today;
    }).pop();
    const currentActualRemaining = todayPoint ? todayPoint.actual : 0;
    const completedEffort = Math.max(0, totalEstimated - currentActualRemaining);
    const progressPct = totalEstimated > 0 ? Math.round((completedEffort / totalEstimated) * 100) : 0;

    return (
      <div 
        className={styles.chartWrapper} 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '200px 1fr', 
          gap: '24px', 
          height: 'auto', 
          padding: '24px', 
          alignItems: 'stretch',
          background: `linear-gradient(135deg, ${cssVar('backgroundSecondaryColor')} 0%, ${cssVar('backgroundPrimaryColor')} 100%)`,
          borderRadius: '12px',
          border: `1px solid ${cssVar('borderColor')}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Stats Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderRight: `1px solid ${cssVar('borderColor')}`, paddingRight: '20px', justifyContent: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sprint Progress</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: cssVar('primaryColor') }}>{progressPct}%</span>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Burned</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: cssVar('textSecondaryColor'), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b' }}></span>
                Total Issues:
              </span>
              <span style={{ fontWeight: 600, color: cssVar('textPrimaryColor') }}>{cycleIssues.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: cssVar('textSecondaryColor'), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                Completed:
              </span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>
                {cycleIssues.filter(i => i.status.toLowerCase() === 'done').length}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: cssVar('textSecondaryColor'), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></span>
                Total Effort:
              </span>
              <span style={{ fontWeight: 600, color: cssVar('textPrimaryColor') }}>{totalEstimated}h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: cssVar('textSecondaryColor'), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                Burned Effort:
              </span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>{completedEffort}h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: cssVar('textSecondaryColor'), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                Remaining:
              </span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>{currentActualRemaining}h</span>
            </div>
          </div>
        </div>

        {/* Graph Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', justifyContent: 'flex-end', paddingRight: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: cssVar('textSecondaryColor') }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', backgroundColor: '#a855f7', border: '1px dashed #a855f7', borderRadius: '1px' }}></span>
              Ideal Burn
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: cssVar('textSecondaryColor') }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', backgroundColor: '#3b82f6', borderRadius: '1.5px' }}></span>
              Actual Burn (Remaining Effort)
            </span>
          </div>

          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="actualBurnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const val = totalEstimated * ratio;
                const y = getY(val);
                return (
                  <g key={idx}>
                    <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={cssVar('borderColor')} strokeWidth="1" strokeDasharray="4 4" style={{ opacity: 0.8 }} />
                    <text x={padding - 8} y={y + 3} fontSize="9" fill={cssVar('textSecondaryColor')} fontWeight="500" textAnchor="end">{Math.round(val)}h</text>
                  </g>
                );
              })}

              {/* X Axis Date Labels */}
              {dataPoints.map((pt, idx) => {
                if (idx === 0 || idx === totalDays || (totalDays > 6 && idx === Math.round(totalDays / 2))) {
                  const x = getX(idx);
                  return (
                    <text key={idx} x={x} y={height - padding + 16} fontSize="9" fill={cssVar('textSecondaryColor')} fontWeight="500" textAnchor="middle">{pt.dateStr}</text>
                  );
                }
                return null;
              })}

              {/* Ideal line */}
              <line
                x1={getX(0)}
                y1={getY(totalEstimated)}
                x2={getX(totalDays)}
                y2={getY(0)}
                stroke="#a855f7"
                strokeWidth="2"
                strokeDasharray="4 4"
                style={{ opacity: 0.7 }}
              />

              {/* Actual fill under curve */}
              {fillPath && (
                <path
                  d={fillPath}
                  fill="url(#actualBurnGrad)"
                />
              )}

              {/* Actual line */}
              {actualPath && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points on Actual */}
              {dataPoints.map((pt, idx) => {
                const currentDayDate = new Date(start.getTime() + idx * 24 * 60 * 60 * 1000);
                if (currentDayDate <= today) {
                  return (
                    <circle
                      key={idx}
                      cx={getX(idx)}
                      cy={getY(pt.actual)}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      style={{ filter: 'drop-shadow(0px 2px 4px rgba(59, 130, 246, 0.35))' }}
                    />
                  );
                }
                return null;
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER WORKLOAD SVG BAR CHART ---
  // --- RENDER WORKLOAD SVG BAR CHART ---
  const renderWorkloadChart = () => {
    // Group issues by assignee
    const workloadMap: Record<string, { name: string; avatarUrl: string; totalEst: number; issueCount: number }> = {};

    issues.forEach(iss => {
      const assigneesList = iss.assignees || [];
      if (assigneesList.length === 0) {
        const unassignedKey = 'Unassigned';
        if (!workloadMap[unassignedKey]) {
          workloadMap[unassignedKey] = { name: 'Unassigned', avatarUrl: '', totalEst: 0, issueCount: 0 };
        }
        workloadMap[unassignedKey].totalEst += (iss.estimatedTime || 1);
        workloadMap[unassignedKey].issueCount++;
      } else {
        assigneesList.forEach((ass: any) => {
          const u = ass.user;
          if (!workloadMap[u.id]) {
            workloadMap[u.id] = { name: u.name || u.email, avatarUrl: u.avatarUrl || '', totalEst: 0, issueCount: 0 };
          }
          workloadMap[u.id].totalEst += (iss.estimatedTime || 1);
          workloadMap[u.id].issueCount++;
        });
      }
    });

    const workloadList = Object.values(workloadMap);
    if (workloadList.length === 0) {
      return <div className={styles.chartWrapper}>Create and assign work items to populate the workload analytics.</div>;
    }

    // Sort workload by hours descending
    workloadList.sort((a, b) => b.totalEst - a.totalEst);

    const maxEst = Math.max(1, ...workloadList.map(w => w.totalEst));

    return (
      <div 
        className={styles.chartWrapper} 
        style={{ 
          flexDirection: 'column', 
          height: 'auto', 
          padding: '24px', 
          gap: '20px', 
          alignItems: 'stretch',
          background: `linear-gradient(135deg, ${cssVar('backgroundSecondaryColor')} 0%, ${cssVar('backgroundPrimaryColor')} 100%)`,
          borderRadius: '12px',
          border: `1px solid ${cssVar('borderColor')}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${cssVar('borderColor')}`, paddingBottom: '12px', marginBottom: '4px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Workload Distribution</h4>
          <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Capacity: 40h</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {workloadList.map((w, idx) => {
            const pct = Math.min(100, (w.totalEst / 40) * 100);
            
            // Workload warning status
            let loadLabel = 'Optimal';
            let loadColor = '#10b981';
            let bgLight = 'rgba(16, 185, 129, 0.1)';
            
            if (w.totalEst > 40) {
              loadLabel = 'Overloaded';
              loadColor = '#ef4444';
              bgLight = 'rgba(239, 68, 68, 0.1)';
            } else if (w.totalEst >= 25) {
              loadLabel = 'High Load';
              loadColor = '#f59e0b';
              bgLight = 'rgba(245, 158, 11, 0.1)';
            } else if (w.name === 'Unassigned') {
              loadLabel = 'Pending';
              loadColor = '#64748b';
              bgLight = 'rgba(100, 116, 139, 0.1)';
            } else if (w.totalEst === 0) {
              loadLabel = 'Idle';
              loadColor = '#94a3b8';
              bgLight = 'rgba(148, 163, 184, 0.1)';
            }

            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '10px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.01)',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.borderColor = loadColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.01)';
                  e.currentTarget.style.borderColor = cssVar('borderColor');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {w.avatarUrl ? (
                      <img src={w.avatarUrl} alt={w.name} style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0 }} />
                    ) : (
                      <span className={styles.avatar} style={{ width: '22px', height: '22px', fontSize: '9px', fontWeight: 700, flexShrink: 0, backgroundColor: w.name === 'Unassigned' ? '#64748b' : cssVar('primaryColor') }}>
                        {w.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: '13px', color: cssVar('textPrimaryColor'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: loadColor, backgroundColor: bgLight, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.02em', flexShrink: 0 }}>
                    {loadLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                  <span>{w.issueCount} work item{w.issueCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontWeight: 600, color: cssVar('textPrimaryColor') }}>{w.totalEst}h allocated</span>
                </div>

                <div style={{ width: '100%', height: '6px', backgroundColor: cssVar('borderColor'), borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div 
                    style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      background: `linear-gradient(90deg, #3b82f6 0%, ${loadColor} 100%)`, 
                      borderRadius: '3px', 
                      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- RENDERING VIEWS ---

  if (isLocked) {
    return (
      <>
        {spinKeyframesStyle}
        {renderLockScreen()}
      </>
    );
  }

  // --- Projects List Loading Skeleton ---
  if (projectsLoading && !selectedProjectId) {
    return (
      <>
        <ViewTitle title="Projects" />
        <ViewIcon icon="collection" />
        <ViewHeader>
          <Header
            left={
              <div style={{ height: '32px', width: '120px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
            }
            center={
              <div style={{ height: '32px', width: '240px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
            }
          />
        </ViewHeader>
        <ViewBody>
          <div className={styles.container}>
            <div className={styles.header}>
              <div style={{ height: '28px', width: '200px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '8px' }} />
              <div style={{ height: '16px', width: '400px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
            </div>
            <div className={styles.bodyContent}>
              <div className={styles.projectGrid}>
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={styles.projectCard}
                    style={{ border: `1px solid ${cssVar('borderColor')}`, padding: '16px', minHeight: '160px', opacity: 0.6 }}
                  >
                    <div style={{ height: '4px', margin: '-16px -16px 16px -16px', background: cssVar('borderColor'), animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '20px', width: '60%', borderRadius: '4px', background: cssVar('borderColor'), marginBottom: '12px', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '14px', width: '90%', borderRadius: '4px', background: cssVar('borderColor'), marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '14px', width: '40%', borderRadius: '4px', background: cssVar('borderColor'), marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ height: '18px', width: '50px', borderRadius: '4px', background: cssVar('borderColor'), animation: 'pulse 1.5s infinite' }} />
                      <div style={{ height: '14px', width: '80px', borderRadius: '4px', background: cssVar('borderColor'), animation: 'pulse 1.5s infinite' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ViewBody>
      </>
    );
  }

  // Project Detail View
  if (selectedProjectId) {
    if (projectsLoading || currentProjectLoading || !currentProject) {
      return (
        <>
          <ViewTitle title="Loading Project..." />
          <ViewIcon icon="collection" />
          <ViewBody>
            <div className={styles.container}>
              <div className={styles.header}>
                {/* Back to projects breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', opacity: 0.3 }}>
                  <div style={{ height: '16px', width: '80px', borderRadius: '4px', background: cssVar('borderColor'), animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '12px' }}>/</span>
                  <div style={{ height: '16px', width: '120px', borderRadius: '4px', background: cssVar('borderColor'), animation: 'pulse 1.5s infinite' }} />
                </div>
                {/* Project Title and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ height: '32px', width: '32px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '28px', width: '180px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '20px', width: '60px', borderRadius: '10px', background: cssVar('borderColor'), opacity: 0.2, animation: 'pulse 1.5s infinite' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ height: '32px', width: '90px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '32px', width: '90px', borderRadius: '8px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
                  </div>
                </div>
                {/* Tabs Bar */}
                <div style={{ display: 'flex', gap: '16px', borderBottom: `1px solid ${cssVar('borderColor')}`, paddingBottom: '8px', marginBottom: '20px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ height: '16px', width: '70px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              </div>
              {/* Main Content Area Skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                  <div style={{ flex: 1, height: '300px', borderRadius: '12px', border: `1px solid ${cssVar('borderColor')}`, padding: '16px', background: cssVar('backgroundSecondaryColor'), opacity: 0.5 }}>
                    <div style={{ height: '16px', width: '100px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '16px' }} />
                    <div style={{ height: '12px', width: '100%', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '8px' }} />
                    <div style={{ height: '12px', width: '90%', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '8px' }} />
                  </div>
                  <div style={{ flex: 1, height: '300px', borderRadius: '12px', border: `1px solid ${cssVar('borderColor')}`, padding: '16px', background: cssVar('backgroundSecondaryColor'), opacity: 0.5 }}>
                    <div style={{ height: '16px', width: '100px', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '16px' }} />
                    <div style={{ height: '12px', width: '100%', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '8px' }} />
                    <div style={{ height: '12px', width: '80%', borderRadius: '4px', background: cssVar('borderColor'), opacity: 0.3, animation: 'pulse 1.5s infinite', marginBottom: '8px' }} />
                  </div>
                </div>
              </div>
            </div>
          </ViewBody>
        </>
      );
    }

    const completedIssuesCount = issues.filter(iss => iss.status.toLowerCase() === 'done').length;
    const progressPercent = issues.length > 0 ? Math.round((completedIssuesCount / issues.length) * 100) : 0;
    const openBugsCount = issues.filter(iss => iss.type.toLowerCase() === 'bug' && iss.status.toLowerCase() !== 'done').length;

    return (
      <>
        <ViewTitle title={currentProject.name} />
        <ViewIcon icon="collection" />
        <ViewHeader>
          <Header
            left={
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => handleBackToList()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: cssVar('textPrimaryColor'),
                }}
              >
                <ArrowLeftBigIcon style={{ fontSize: 16 }} />
                <span>Back</span>
              </button>
            }
            right={
              !isShareMode ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => handleOpenShareModal(currentProject.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      cursor: 'pointer',
                    }}
                  >
                    <ShareIcon style={{ fontSize: 14 }} />
                    <span>Share Project</span>
                  </button>
                  <Menu
                    items={
                      <MenuItem
                        onClick={() => handleDeleteProject(currentProject.id)}
                        style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <TrashIconSvg />
                        <span>Delete Project</span>
                      </MenuItem>
                    }
                  >
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: `1px solid ${cssVar('borderColor')}`,
                        height: '32px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: cssVar('backgroundPrimaryColor'),
                        color: cssVar('textPrimaryColor'),
                        cursor: 'pointer',
                      }}
                    >
                      <span>More</span>
                      <ChevronDownIconSvg />
                    </button>
                  </Menu>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#a855f7',
                    background: 'rgba(168, 85, 247, 0.1)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                  }}
                >
                  Guest View-Only
                </span>
              )
            }
          />
        </ViewHeader>
        <ViewBody>
          <div className={styles.container} style={{ overflowY: currentTab === 'board' ? 'hidden' : 'auto' }}>
            {/* Project Sub-Header in Page Body */}
            <div className={styles.header} style={{ borderBottom: `1px solid ${cssVar('borderColor')}`, paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <div className={styles.title} style={{ color: currentProject.color || '#3b82f6', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentProject.icon && <span>{currentProject.icon}</span>}
                  <span>{currentProject.name}</span>
                </div>
                {!isShareMode ? (
                  <Menu
                    items={
                      ['Planning', 'Active', 'Maintenance', 'Completed'].map(statusOption => (
                        <MenuItem
                          key={statusOption}
                          onClick={async () => {
                            try {
                              await triggerUpdateProject({
                                workspaceId,
                                id: currentProject.id,
                                input: { status: statusOption },
                              });
                              mutateQuery(projectQuery);
                              mutateQuery(projectsQuery);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          style={{
                            color: statusOption === currentProject.status ? '#a855f7' : cssVar('textPrimaryColor'),
                            fontWeight: statusOption === currentProject.status ? 600 : 500,
                          }}
                        >
                          {statusOption}
                        </MenuItem>
                      ))
                    }
                  >
                    <div
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: currentProject.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                        color: currentProject.status === 'Active' ? '#10b981' : '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        border: `1px solid ${currentProject.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        userSelect: 'none',
                        transition: 'all 0.15s ease-in-out',
                        outline: 'none',
                      }}
                      onMouseEnter={(e) => {
                        const bg = currentProject.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)';
                        e.currentTarget.style.borderColor = bg;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onMouseLeave={(e) => {
                        const bg = currentProject.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)';
                        e.currentTarget.style.borderColor = bg;
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.outline = 'none';
                      }}
                    >
                      <span>{currentProject.status}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </Menu>
                ) : (
                  <div
                    className={styles.statusBadge}
                    style={{
                      backgroundColor: currentProject.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                      color: currentProject.status === 'Active' ? '#10b981' : '#94a3b8',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      borderRadius: '12px',
                      cursor: 'default',
                      display: 'inline-flex',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                  >
                    {currentProject.status}
                  </div>
                )}
                <span className={styles.statusBadge} style={{
                  backgroundColor: (currentProject.visibility || '').toLowerCase() === 'restricted' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  color: (currentProject.visibility || '').toLowerCase() === 'restricted' ? '#ef4444' : '#3b82f6',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                }}>
                  {(currentProject.visibility || '').toLowerCase() === 'restricted' ? 'Restricted' : 'Workspace-wide'}
                </span>
              </div>
              <p style={{ margin: '0', fontSize: '13.5px', color: '#64748b', maxWidth: '800px', lineHeight: 1.5 }}>
                {currentProject.description || 'No description provided.'}
              </p>
              <div style={{
                marginTop: '16px',
                borderTop: `1px solid ${cssVar('borderColor')}33`,
                paddingTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                width: '100%',
              }}>
                <RadioGroup
                  value={currentTab}
                  onChange={(val) => handleTabChange(val)}
                  items={tabRadioItems}
                  itemHeight={34}
                  padding={4}
                  gap={6}
                  borderRadius={10}
                  style={{ maxWidth: '100%', width: 'auto' }}
                />

                {!isShareMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {(currentTab === 'board' || currentTab === 'issues') && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.createWorkItemBtn}`}
                        onClick={() => setIsIssueModalOpen(true)}
                        style={{ height: '36px', minHeight: '36px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <PlusIconSvg /> Create Work Item
                      </button>
                    )}
                    {currentTab === 'cycles' && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => setIsCycleModalOpen(true)}
                        style={{ height: '36px', minHeight: '36px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <PlusIconSvg /> Create Cycle
                      </button>
                    )}
                    {currentTab === 'releases' && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => setIsReleaseModalOpen(true)}
                        style={{ height: '36px', minHeight: '36px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <PlusIconSvg /> Create Release
                      </button>
                    )}
                    {currentTab === 'modules' && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => setIsModuleModalOpen(true)}
                        style={{ height: '36px', minHeight: '36px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <PlusIconSvg /> Create Module
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tab Contents */}
            <div className={styles.bodyContent}>
              {currentTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                  {/* Stats cards row - Single row across full width */}
                  <div className={styles.statsRow} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', width: '100%', marginBottom: '8px' }}>
                    {/* Total Work Items */}
                    <div
                      className={styles.statBox}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '16px',
                        borderLeft: '4px solid #3b82f6',
                        padding: '16px 20px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = cssVar('borderColor');
                        e.currentTarget.style.borderLeft = '4px solid #3b82f6';
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <BriefcaseIconSvg />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className={styles.statValue} style={{ color: '#2563eb', fontSize: '24px', lineHeight: 1.2, margin: 0 }}>{issues.length}</span>
                        <span className={styles.statLabel} style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500, textTransform: 'none' }}>Total Work Items</span>
                      </div>
                    </div>

                    {/* Completion Rate */}
                    <div
                      className={styles.statBox}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '16px',
                        borderLeft: '4px solid #10b981',
                        padding: '16px 20px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#10b981';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = cssVar('borderColor');
                        e.currentTarget.style.borderLeft = '4px solid #10b981';
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <TrendUpIconSvg />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className={styles.statValue} style={{ color: '#10b981', fontSize: '24px', lineHeight: 1.2, margin: 0 }}>{progressPercent}%</span>
                        <span className={styles.statLabel} style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500, textTransform: 'none' }}>Completion Rate</span>
                      </div>
                    </div>

                    {/* Open Bugs */}
                    <div
                      className={styles.statBox}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '16px',
                        borderLeft: '4px solid #ef4444',
                        padding: '16px 20px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = cssVar('borderColor');
                        e.currentTarget.style.borderLeft = '4px solid #ef4444';
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <BugIconSvg />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className={styles.statValue} style={{ color: '#ef4444', fontSize: '24px', lineHeight: 1.2, margin: 0 }}>{openBugsCount}</span>
                        <span className={styles.statLabel} style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500, textTransform: 'none' }}>Open Bugs</span>
                      </div>
                    </div>

                    {/* Upcoming Release */}
                    <div
                      className={styles.statBox}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '16px',
                        borderLeft: '4px solid #8b5cf6',
                        padding: '16px 20px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.borderColor = '#8b5cf6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = cssVar('borderColor');
                        e.currentTarget.style.borderLeft = '4px solid #8b5cf6';
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                        color: '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CalendarIconSvg />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className={styles.statValue} style={{ color: '#8b5cf6', fontSize: '24px', lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {releases.find(r => r.status !== 'Released')?.name || 'None'}
                        </span>
                        <span className={styles.statLabel} style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500, textTransform: 'none' }}>Upcoming Release</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.overviewGrid}>
                    {/* Left Column */}
                    <div className={styles.overviewMain}>
                      {/* Main overview details card */}
                      <div className={styles.dashboardCard} style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Project Description</h3>
                          {!isShareMode && (
                            <button
                              onClick={() => {
                                if (isEditingDesc) {
                                  setIsEditingDesc(false);
                                  setDescInput(currentProject.description || '');
                                } else {
                                  setIsEditingDesc(true);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: cssVar('primaryColor'),
                                fontSize: '12.5px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                transition: 'background-color 0.15s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = cssVar('hoverColor')}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <EditIconSvg />
                              <span>{isEditingDesc ? 'Cancel' : 'Edit'}</span>
                            </button>
                          )}
                        </div>

                        {isEditingDesc ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <textarea
                              value={descInput}
                              onChange={(e) => setDescInput(e.target.value)}
                              placeholder="Add a detailed description about the project's parameters and goals..."
                              style={{
                                width: '100%',
                                minHeight: '90px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: `1px solid ${cssVar('borderColor')}`,
                                backgroundColor: cssVar('backgroundPrimaryColor'),
                                color: cssVar('textPrimaryColor'),
                                fontFamily: 'inherit',
                                fontSize: '14px',
                                resize: 'vertical',
                                outline: 'none',
                                lineHeight: 1.5,
                                transition: 'border-color 0.2s',
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = cssVar('primaryColor')}
                              onBlur={(e) => e.currentTarget.style.borderColor = cssVar('borderColor')}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                style={{ padding: '6px 14px', fontSize: '12px', height: '32px' }}
                                onClick={async () => {
                                  try {
                                    await triggerUpdateProject({
                                      workspaceId,
                                      id: currentProject.id,
                                      input: { description: descInput },
                                    });
                                    mutateQuery(projectQuery);
                                    setIsEditingDesc(false);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                              >
                                Save Description
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '14px', lineHeight: 1.6, color: cssVar('textSecondaryColor') }}>
                            {currentProject.description || 'Add a project description in the settings to help guide your team.'}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Overall Development Progress</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{progressPercent}% completed</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: cssVar('borderColor'), borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.4s ease-in-out' }} />
                          </div>
                        </div>
                      </div>

                      {/* Active Cycle tracker (if exists) */}
                      {cycles.some(c => c.status === 'Active') && (
                        <div className={styles.dashboardCard} style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>
                              Active Sprint: {cycles.find(c => c.status === 'Active')?.name}
                            </h3>
                            <span className={styles.statusBadge} style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '11px', padding: '2px 8px' }}>
                              Active
                            </span>
                          </div>
                          {renderBurndownChart(cycles.find(c => c.status === 'Active'))}
                        </div>
                      )}

                      {/* Project Milestones Timeline */}
                      <div className={styles.dashboardCard} style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: cssVar('textPrimaryColor') }}>
                          <TodayIcon style={{ fontSize: 18, color: cssVar('primaryColor') }} />
                          <span>Project Milestones Timeline</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '20px', borderLeft: `2px solid ${cssVar('borderColor')}`, marginLeft: '8px', marginTop: '12px' }}>
                          {/* Active Cycle */}
                          {cycles.filter(c => c.status === 'Active').map(cyc => (
                            <div key={cyc.id} style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '-26px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', border: `2px solid ${cssVar('backgroundSecondaryColor')}` }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: cssVar('textPrimaryColor') }}>{cyc.name} (Active Cycle)</span>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>In Progress</span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: cssVar('textSecondaryColor'), lineHeight: 1.4 }}>
                                Target End: {cyc.endDate ? new Date(cyc.endDate).toLocaleDateString() : 'N/A'} — {cyc.goal || 'No goal set'}
                              </p>
                            </div>
                          ))}
                          {/* Upcoming Releases */}
                          {releases.filter(r => r.status !== 'Released').map(rel => (
                            <div key={rel.id} style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '-26px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8b5cf6', border: `2px solid ${cssVar('backgroundSecondaryColor')}` }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: cssVar('textPrimaryColor') }}>Release: {rel.name}</span>
                                <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700 }}>Version Goal</span>
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: cssVar('textSecondaryColor'), lineHeight: 1.4 }}>
                                Planned: {rel.plannedDate ? new Date(rel.plannedDate).toLocaleDateString() : 'N/A'} — {rel.description || 'No description provided.'}
                              </p>
                            </div>
                          ))}
                          {cycles.length === 0 && releases.length === 0 && (
                            <div style={{ fontSize: '13px', color: cssVar('textSecondaryColor'), fontStyle: 'italic' }}>
                              No active cycles or upcoming version releases defined. Create them in their respective tabs to populate this timeline.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column / Sidebar */}
                    <div className={styles.overviewSidebar} style={{ gap: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <div>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Project Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${cssVar('borderColor')}33`, paddingBottom: '8px' }}>
                      <span style={{ color: cssVar('textSecondaryColor') }}>Status</span>
                      <span style={{ fontWeight: 600, color: currentProject.status === 'Active' ? '#10b981' : '#3b82f6' }}>{currentProject.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${cssVar('borderColor')}33`, paddingBottom: '8px', alignItems: 'center' }}>
                      <span style={{ color: cssVar('textSecondaryColor') }}>Project Manager</span>
                      {!isShareMode ? (
                        <select
                          className={styles.select}
                          style={{ fontSize: '12px', padding: '2px 6px', height: '28px', maxWidth: '160px' }}
                          value={currentProject.projectManagerId || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            const pmUser = workspaceMembers.find((m: any) => m.id === val);
                            await triggerUpdateProject({
                              workspaceId,
                              id: currentProject.id,
                              input: {
                                projectManagerId: val || undefined,
                                projectManagerName: pmUser ? (pmUser.name || pmUser.email) : undefined,
                              },
                            });
                            mutateQuery(projectQuery);
                            mutateQuery(projectsQuery);
                          }}
                        >
                          <option value="">Unassigned</option>
                          {workspaceMembers.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name || m.email}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{currentProject.projectManagerName || 'Unassigned'}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${cssVar('borderColor')}33`, paddingBottom: '8px' }}>
                      <span style={{ color: cssVar('textSecondaryColor') }}>Visibility</span>
                      <span style={{ fontWeight: 600, color: (currentProject.visibility || '').toLowerCase() === 'restricted' ? '#ef4444' : '#3b82f6' }}>
                        {(currentProject.visibility || '').toLowerCase() === 'restricted' ? 'Restricted' : 'Workspace-wide'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${cssVar('borderColor')}33`, paddingBottom: '8px' }}>
                      <span style={{ color: cssVar('textSecondaryColor') }}>Created On</span>
                      <span>{new Date(currentProject.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${cssVar('borderColor')}33`, paddingBottom: '8px' }}>
                      <span style={{ color: cssVar('textSecondaryColor') }}>Releases</span>
                      <span>{releases.length} versions</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span style={{ color: cssVar('textSecondaryColor') }}>Functional Modules</span>
                      <span>{modules.length} modules</span>
                    </div>
                  </div>
                </div>

                {/* Team members card in sidebar */}
                {(currentProject.visibility || '').toLowerCase() === 'restricted' && (
                  <div style={{ borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '20px', marginTop: '4px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Project Team</h3>
                    
                    {currentProject.restrictedMembers && currentProject.restrictedMembers.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '36px', marginBottom: '16px' }}>
                          {currentProject.restrictedMembers.slice(0, 5).map((m: any, idx: number) => (
                            <div
                              key={m.userId}
                              title={m.user?.name || m.user?.email}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: `2px solid ${cssVar('backgroundSecondaryColor')}`,
                                position: 'absolute',
                                left: `${idx * 22}px`,
                                zIndex: idx + 1,
                                backgroundColor: cssVar('backgroundPrimaryColor'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              }}
                            >
                              {m.user?.avatarUrl ? (
                                <img src={m.user.avatarUrl} alt={m.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '10px', fontWeight: 700, color: cssVar('textSecondaryColor') }}>
                                  {(m.user?.name || m.user?.email || 'U').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                          {currentProject.restrictedMembers.length > 5 && (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: `2px solid ${cssVar('backgroundSecondaryColor')}`,
                                position: 'absolute',
                                left: `${5 * 22}px`,
                                zIndex: 6,
                                backgroundColor: cssVar('hoverColor'),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              }}
                            >
                              <span style={{ fontSize: '10px', fontWeight: 700, color: cssVar('textSecondaryColor') }}>
                                +{currentProject.restrictedMembers.length - 5}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* List of text names in small layout */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                          {currentProject.restrictedMembers.map((m: any) => (
                            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: cssVar('textPrimaryColor') }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {m.user?.name || m.user?.email}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '12.5px', color: cssVar('textSecondaryColor'), marginBottom: '16px', lineHeight: 1.4 }}>
                        Access is restricted, but no specific team members have been added yet. Admins have access automatically.
                      </div>
                    )}

                    {/* Member selection triggers inside sidebar */}
                    {!isShareMode && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                          className={styles.select}
                          defaultValue=""
                          style={{ width: '100%', fontSize: '12.5px', height: '32px' }}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const currentMems = (currentProject.restrictedMembers || []).map((m: any) => m.userId);
                            if (!currentMems.includes(val)) {
                              const newMems = [...currentMems, val];
                              await triggerUpdateProject({
                                workspaceId,
                                id: currentProject.id,
                                input: { restrictedMembers: newMems },
                              });
                              mutateQuery(projectQuery);
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="" disabled>Add Collaborator...</option>
                          {workspaceMembers.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name || m.email}</option>
                          ))}
                        </select>
                        {currentProject.restrictedMembers && currentProject.restrictedMembers.length > 0 && (
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ width: '100%', fontSize: '12px', height: '30px', padding: '0 8px' }}
                            onClick={async () => {
                              await triggerUpdateProject({
                                workspaceId,
                                id: currentProject.id,
                                input: { restrictedMembers: [] },
                              });
                              mutateQuery(projectQuery);
                            }}
                          >
                            Clear Collaborators
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {currentTab === 'board' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', width: '100%', overflow: 'hidden' }}>
              <div ref={boardContainerRef} className={styles.boardContainer} onDragOver={isShareMode ? undefined : handleBoardDragOver}>
              {['Backlog', 'Todo', 'InProgress', 'InReview', 'Testing', 'Done'].map(statusName => {
                const statusIssues = issues.filter(iss => iss.status.toLowerCase() === statusName.toLowerCase());
                const slicedIssues = statusIssues.slice(0, visibleLimits[statusName] || 30);
                return (
                  <div
                    key={statusName}
                    className={styles.boardColumn}
                    onDragOver={isShareMode ? undefined : handleDragOver}
                    onDrop={isShareMode ? undefined : (e) => handleDrop(e, statusName)}
                    onDragLeave={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX;
                      const y = e.clientY;
                      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                        setDraggedOverCardId(null);
                        setDragTargetStatus(null);
                      }
                    }}
                    style={{ height: '100%' }}
                  >
                    <div className={styles.boardColumnHeader}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(statusName).text,
                        }} />
                        {statusName === 'InProgress' ? 'In Progress' : statusName === 'InReview' ? 'In Review' : statusName}
                      </span>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>
                        {statusIssues.length}
                      </span>
                    </div>

                    <div className={styles.boardColumnList} style={{ overflowY: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px' }}>
                      {slicedIssues.length === 0 ? (
                        <div className={styles.boardColumnEmpty}>Drop work items here</div>
                      ) : (
                        <Virtuoso
                          style={{ height: '100%', width: '100%', minHeight: '350px', padding: 0, boxSizing: 'border-box', overflowX: 'hidden' }}
                          data={slicedIssues}
                          endReached={() => handleLoadMore(statusName, slicedIssues.length, statusIssues.length)}
                          components={{
                            Header: () => <div style={{ height: '16px' }} />,
                            Footer: () => <div style={{ height: '16px' }} />,
                          }}
                          itemContent={(index, issue) => {
                            const projectPrefix = (currentProject?.name || 'PROJ').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'PROJ';
                            const issueIndex = issues.findIndex(i => i.id === issue.id) + 1 || 1;
                            const issueIdStr = `${projectPrefix}-${issueIndex}`;
                            return (
                              <div 
                                style={{ padding: '6px 0 12px 0', position: 'relative', width: '100%', boxSizing: 'border-box' }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (draggedOverCardId !== issue.id) {
                                    setDraggedOverCardId(issue.id);
                                    setDragTargetStatus(statusName);
                                  }
                                }}
                              >
                                {draggedOverCardId === issue.id && dragTargetStatus === statusName && (
                                  <div 
                                    style={{
                                      height: '3px',
                                      backgroundColor: '#ffffff',
                                      borderRadius: '1.5px',
                                      boxShadow: '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(168, 85, 247, 0.6)',
                                      margin: '0 0 12px 0',
                                      transition: 'all 0.15s ease',
                                    }} 
                                  />
                                )}
                                <BoardCard
                                  key={issue.id}
                                  issue={issue}
                                  issueId={issueIdStr}
                                  onViewDetails={setSelectedIssueIdForView}
                                  onUpdateStatus={handleUpdateIssueStatus}
                                  onUpdatePriority={async (id, pri) => {
                                    try {
                                      await triggerUpdateIssue({
                                        workspaceId,
                                        id,
                                        input: { priority: pri },
                                      });
                                      mutateQuery(projectIssuesQuery);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  onAssignToMe={async (id) => {
                                    try {
                                      if (currentUser) {
                                        await triggerUpdateIssue({
                                          workspaceId,
                                          id,
                                          input: { assigneeIds: [currentUser.id] } as any,
                                        });
                                        mutateQuery(projectIssuesQuery);
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  onDelete={async (id) => {
                                    try {
                                      await triggerDeleteIssue({ workspaceId, id });
                                      mutateQuery(projectIssuesQuery);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  currentUser={currentUser}
                                  isShareMode={isShareMode}
                                  isFromBlueprint={isIssueFromBlueprint(issue)}
                                  isNearBottom={index >= slicedIssues.length - 2}
                                />
                              </div>
                            );
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {currentTab === 'issues' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Filter bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Search bar */}
                <div>
                  <div className={styles.searchBar} style={{ width: '320px', maxWidth: '100%' }}>
                    <span className={styles.searchIcon}><SearchIconSvg /></span>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search work items..."
                      value={issueSearch}
                      onChange={(e) => setIssueSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bottom row: Filter Group & Sort Group */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: cssVar('backgroundSecondaryColor'), padding: '10px 14px', borderRadius: '10px', border: `1px solid ${cssVar('borderColor')}` }}>
                  {/* Filters Group */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters:</span>
                    <select className={styles.select} style={{ width: '130px', height: '34px', minHeight: '34px', fontSize: '12px' }} value={issueTypeFilter} onChange={(e) => setIssueTypeFilter(e.target.value)}>
                      <option value="">All Types</option>
                      <option value="Task">Task</option>
                      <option value="Bug">Bug</option>
                      <option value="Feature">Feature</option>
                      <option value="Improvement">Improvement</option>
                      <option value="Research">Research</option>
                    </select>

                    <select className={styles.select} style={{ width: '130px', height: '34px', minHeight: '34px', fontSize: '12px' }} value={issuePriorityFilter} onChange={(e) => setIssuePriorityFilter(e.target.value)}>
                      <option value="">All Priorities</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>

                    <select className={styles.select} style={{ width: '140px', height: '34px', minHeight: '34px', fontSize: '12px' }} value={issueStatusFilter} onChange={(e) => setIssueStatusFilter(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="Backlog">Backlog</option>
                      <option value="Todo">Todo</option>
                      <option value="InProgress">In Progress</option>
                      <option value="InReview">In Review</option>
                      <option value="Testing">Testing</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  {/* Sort Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort:</span>
                    <select className={styles.select} style={{ width: '140px', height: '34px', minHeight: '34px', fontSize: '12px' }} value={issueSortBy} onChange={(e) => setIssueSortBy(e.target.value)}>
                      <option value="createdAt">Created Date</option>
                      <option value="dueDate">Due Date</option>
                      <option value="priority">Priority</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => setIssueSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      style={{ height: '34px', minHeight: '34px', padding: '0 12px', fontSize: '12px' }}
                    >
                      {issueSortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Title</th>
                      <th className={styles.th}>Type</th>
                      <th className={styles.th}>Priority</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Assignee</th>
                      <th className={styles.th}>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map(iss => {
                      const pri = getPriorityColor(iss.priority);
                      const sta = getStatusColor(iss.status);
                      return (
                        <tr key={iss.id} className={styles.tr} onClick={() => setSelectedIssueIdForView(iss.id)} style={{
                          cursor: 'pointer',
                          backgroundColor: isOverdue(iss.dueDate, iss.status) ? '#fff1f2' : undefined,
                          borderLeft: isOverdue(iss.dueDate, iss.status) ? '4px solid #ef4444' : undefined
                        }}>
                          <td className={styles.td} style={{ fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {iss.title}
                              {isIssueFromBlueprint(iss) && (
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: 'rgba(168, 85, 247, 0.08)',
                                  color: '#a855f7',
                                  border: '1px solid rgba(168, 85, 247, 0.15)',
                                  whiteSpace: 'nowrap'
                                }}>
                                  Blueprint
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={styles.td}>{iss.type}</td>
                          <td className={styles.td}>
                            <span className={styles.priorityBadge} style={{ backgroundColor: pri.bg, color: pri.text }}>
                              {iss.priority}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.statusBadge} style={{ backgroundColor: sta.bg, color: sta.text }}>
                              {iss.status}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {iss.assignees && iss.assignees.map((ass: any) => (
                                <span key={ass.userId} className={styles.avatar} style={{ width: '20px', height: '20px', fontSize: '9px' }}>
                                  {(ass.user?.name || ass.user?.email || 'U').charAt(0).toUpperCase()}
                                </span>
                              ))}
                              {(!iss.assignees || iss.assignees.length === 0) && (
                                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className={styles.td}>
                            {iss.dueDate ? new Date(iss.dueDate).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {issues.length === 0 && (
                      <tr>
                        <td colSpan={6} className={styles.td} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                          No work items found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'cycles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Project Cycles (Sprints)</h3>
              </div>
 
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
                {/* List of cycles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cycles.map(cyc => (
                    <div key={cyc.id} className={styles.dashboardCard} style={{
                      cursor: 'pointer',
                      border: isOverdue(cyc.endDate, cyc.status) ? '2px solid #ef4444' : cyc.status === 'Active' ? `2px solid ${cssVar('primaryColor')}` : `1px solid ${cssVar('borderColor')}`,
                      boxShadow: isOverdue(cyc.endDate, cyc.status) ? '0 0 8px rgba(239, 68, 68, 0.15)' : undefined
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{cyc.name}</span>
                        <span className={styles.statusBadge} style={{
                          backgroundColor: cyc.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : cyc.status === 'Completed' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: cyc.status === 'Active' ? '#10b981' : cyc.status === 'Completed' ? '#94a3b8' : '#3b82f6',
                        }}>
                          {cyc.status}
                        </span>
                      </div>
                      {cyc.goal && <p style={{ margin: '4px 0', fontSize: '13px', color: '#64748b' }}>Goal: {cyc.goal}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                        <span>Start: {cyc.startDate ? new Date(cyc.startDate).toLocaleDateString() : 'N/A'}</span>
                        <span>End: {cyc.endDate ? new Date(cyc.endDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {!isShareMode && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            style={{ flex: 1, padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCycleId(cyc.id);
                              setCycleForm({
                                name: cyc.name,
                                goal: cyc.goal || '',
                                startDate: cyc.startDate ? new Date(cyc.startDate).toISOString().split('T')[0] : '',
                                endDate: cyc.endDate ? new Date(cyc.endDate).toISOString().split('T')[0] : '',
                                status: cyc.status,
                              });
                              setIsCycleModalOpen(true);
                            }}
                          >
                            <EditIconSvg /> Edit Cycle
                          </button>
                          {cyc.status === 'Active' && (
                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await triggerUpdateCycle({ workspaceId, id: cyc.id, status: 'Completed' });
                                mutateQuery(projectCyclesQuery);
                              }}
                            >
                              Complete
                            </button>
                          )}
                          {cyc.status === 'Completed' && (
                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await triggerUpdateCycle({ workspaceId, id: cyc.id, status: 'Active' });
                                mutateQuery(projectCyclesQuery);
                              }}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {cycles.length === 0 && (
                    <div className={styles.boardColumnEmpty}>No cycles configured yet. Click "Create Cycle" to get started.</div>
                  )}
                </div>

                {/* Active Cycle Burndown Tracker Chart */}
                <div className={styles.dashboardCard}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Active Cycle Burndown</h3>
                  {cycles.some(c => c.status === 'Active') ? (
                    renderBurndownChart(cycles.find(c => c.status === 'Active'))
                  ) : (
                    <div className={styles.boardColumnEmpty} style={{ padding: '64px' }}>
                      There is no currently Active cycle. Set a cycle's status to Active to display the sprint burndown chart.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'releases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Product Releases (Versions)</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                {releases.map(rel => {
                  const relIssues = issues.filter(iss => iss.releaseId === rel.id);
                  const relDone = relIssues.filter(iss => iss.status.toLowerCase() === 'done').length;
                  const relPct = relIssues.length > 0 ? Math.round((relDone / relIssues.length) * 100) : 0;
                  const checklistItems = Array.isArray(rel.checklist) ? rel.checklist : [];

                  return (
                    <div key={rel.id} className={styles.dashboardCard} style={{
                      gap: '12px',
                      border: isOverdue(rel.plannedDate, rel.status) ? '2px solid #ef4444' : `1px solid ${cssVar('borderColor')}`,
                      boxShadow: isOverdue(rel.plannedDate, rel.status) ? '0 0 8px rgba(239, 68, 68, 0.15)' : undefined
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{rel.name}</h4>
                            {!isShareMode && (
                              <button
                                onClick={() => {
                                  setEditingReleaseId(rel.id);
                                  setReleaseForm({
                                    name: rel.name,
                                    description: rel.description || '',
                                    plannedDate: rel.plannedDate ? rel.plannedDate.substring(0, 10) : '',
                                    status: rel.status,
                                  });
                                  setIsReleaseModalOpen(true);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#a855f7',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.6,
                                  transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                title="Modify Version Release"
                              >
                                <EditIconSvg />
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Planned: {rel.plannedDate ? new Date(rel.plannedDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <span className={styles.statusBadge} style={{
                          backgroundColor: rel.status === 'Released' ? 'rgba(16, 185, 129, 0.12)' : rel.status === 'Testing' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                          color: rel.status === 'Released' ? '#10b981' : rel.status === 'Testing' ? '#a855f7' : '#3b82f6',
                        }}>
                          {rel.status === 'InDevelopment' ? 'In Dev' : rel.status}
                        </span>
                      </div>

                      {rel.description && <p style={{ fontSize: '13px', margin: 0, color: cssVar('textSecondaryColor') }}>{rel.description}</p>}

                      {/* Release progress */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 500 }}>
                          <span>Development Progress</span>
                          <span>{relPct}% ({relDone}/{relIssues.length} Done)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: cssVar('borderColor'), borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${relPct}%`, height: '100%', backgroundColor: '#10b981' }}></div>
                        </div>
                      </div>

                      {/* Interactive Release Checklist */}
                      <div style={{ borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '12px', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '8px' }}>Release Quality Checklist</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {checklistItems.map((item: any, idx: number) => (
                            <div
                              key={item.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: cssVar('backgroundSecondaryColor'),
                                border: `1px solid ${cssVar('borderColor')}`,
                                gap: '8px',
                                transition: 'all 0.15s ease-in-out',
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: isShareMode ? 'default' : 'pointer', flex: 1, margin: 0, userSelect: 'none' }}>
                                <input
                                  type="checkbox"
                                  checked={!!item.done}
                                  disabled={isShareMode}
                                  onChange={isShareMode ? undefined : () => handleToggleChecklist(rel, idx)}
                                  style={{ cursor: isShareMode ? 'default' : 'pointer' }}
                                />
                                <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? '#94a3b8' : 'inherit', fontWeight: 500 }}>
                                  {item.text}
                                </span>
                              </label>
                              {!isShareMode && (
                                <button
                                  type="button"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    transition: 'background-color 0.2s',
                                  }}
                                  onClick={() => handleDeleteChecklistItem(rel, idx)}
                                  title="Delete checklist item"
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <TrashIconSvg />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {/* Add checklist item */}
                        {!isShareMode && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const inputElem = e.currentTarget.elements.namedItem('newItem') as HTMLInputElement;
                              if (inputElem) {
                                handleAddChecklistItem(rel, inputElem.value);
                                inputElem.value = '';
                              }
                            }}
                            style={{ display: 'flex', gap: '8px', marginTop: '10px' }}
                          >
                            <input
                              type="text"
                              name="newItem"
                              placeholder="Add quality check..."
                              className={styles.input}
                              style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                            />
                            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '4px 10px', fontSize: '12px' }}>
                              Add
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
                {releases.length === 0 && (
                  <div className={styles.boardColumnEmpty} style={{ gridColumn: '1 / -1' }}>No releases defined. Click "Create Release" to start versioning.</div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'modules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Project Functional Modules</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {modules.map(mod => {
                  const modIssues = issues.filter(iss => iss.moduleId === mod.id);
                  const modDone = modIssues.filter(iss => iss.status.toLowerCase() === 'done').length;
                  const modPct = modIssues.length > 0 ? Math.round((modDone / modIssues.length) * 100) : 0;

                  return (
                    <div key={mod.id} className={styles.dashboardCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{mod.name}</h4>
                        {!isShareMode && (
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Module',
                                message: 'Delete this module? Associated work items will remain but be unlinked.',
                                targetId: mod.id,
                                onConfirm: async (id) => {
                                  if (!id) return;
                                  await triggerDeleteModule({ workspaceId, id });
                                  mutateQuery(projectModulesQuery);
                                },
                              });
                            }}
                          >
                            <TrashIconSvg />
                          </button>
                        )}
                      </div>

                      {mod.description && <p style={{ fontSize: '13px', margin: 0, color: '#64748b' }}>{mod.description}</p>}

                      {/* Module Lead */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Module Lead:</span>
                        {mod.lead ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            {mod.lead.avatarUrl ? (
                              <img src={mod.lead.avatarUrl} alt={mod.lead.name} style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                            ) : (
                              <span className={styles.avatar} style={{ width: '18px', height: '18px', fontSize: '8px' }}>
                                {mod.lead.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span style={{ fontWeight: 500 }}>{mod.lead.name}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </div>

                      {/* Module Progress */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                          <span>Module Completion</span>
                          <span>{modPct}% ({modDone}/{modIssues.length} Done)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: cssVar('borderColor'), borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${modPct}%`, height: '100%', backgroundColor: '#8b5cf6' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {modules.length === 0 && (
                  <div className={styles.boardColumnEmpty} style={{ gridColumn: '1 / -1' }}>No modules defined. Click "Create Module" to scope parts of the system.</div>
                )}
              </div>
            </div>
          )}

          {currentTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>Executive Project Analytics</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: cssVar('textSecondaryColor') }}>Real-time metrics, defect density, velocity, and team workload distribution.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: progressPercent >= 50 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${progressPercent >= 50 ? '#10b98133' : '#f59e0b33'}` }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: progressPercent >= 50 ? '#10b981' : '#f59e0b' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: progressPercent >= 50 ? '#10b981' : '#d97706' }}>
                    {progressPercent >= 50 ? 'Project On Track' : 'Needs Acceleration'}
                  </span>
                </div>
              </div>

              {/* 4 KPI Top Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className={styles.dashboardCard} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BriefcaseIconSvg />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Total Work Items</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: cssVar('textPrimaryColor'), lineHeight: 1.1 }}>{issues.length}</div>
                    <span style={{ fontSize: '11.5px', color: cssVar('textSecondaryColor') }}>{completedIssuesCount} completed ({progressPercent}%)</span>
                  </div>
                </div>

                <div className={styles.dashboardCard} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BugIconSvg />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Open Bugs</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: openBugsCount > 0 ? '#ef4444' : '#10b981', lineHeight: 1.1 }}>{openBugsCount}</div>
                    <span style={{ fontSize: '11.5px', color: cssVar('textSecondaryColor') }}>{issues.filter(i => i.type === 'Bug' && i.priority === 'Critical').length} critical severity</span>
                  </div>
                </div>

                <div className={styles.dashboardCard} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClockIconSvg />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Total Effort</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', lineHeight: 1.1 }}>
                      {issues.reduce((sum, iss) => sum + (iss.estimatedTime || 0), 0)} <span style={{ fontSize: '14px', fontWeight: 600 }}>hrs</span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: cssVar('textSecondaryColor') }}>
                      Avg {(issues.reduce((sum, iss) => sum + (iss.estimatedTime || 0), 0) / (issues.length || 1)).toFixed(1)} hrs / item
                    </span>
                  </div>
                </div>

                <div className={styles.dashboardCard} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ViewLayersIconSvg />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Functional Modules</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6', lineHeight: 1.1 }}>{modules.length}</div>
                    <span style={{ fontSize: '11.5px', color: cssVar('textSecondaryColor') }}>{cycles.length} active cycles / sprints</span>
                  </div>
                </div>
              </div>

              {/* Charts & Distributions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Status Distribution */}
                <div className={styles.dashboardCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>Status Distribution Breakdown</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { status: 'Done', color: '#10b981' },
                      { status: 'Testing', color: '#8b5cf6' },
                      { status: 'InReview', label: 'In Review', color: '#f59e0b' },
                      { status: 'InProgress', label: 'In Progress', color: '#3b82f6' },
                      { status: 'Todo', color: '#64748b' },
                      { status: 'Backlog', color: '#94a3b8' },
                    ].map(st => {
                      const count = issues.filter(i => i.status === st.status).length;
                      const pct = issues.length > 0 ? Math.round((count / issues.length) * 100) : 0;
                      return (
                        <div key={st.status} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                            <span style={{ color: cssVar('textPrimaryColor') }}>{st.label || st.status}</span>
                            <span style={{ color: cssVar('textSecondaryColor') }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: cssVar('borderColor'), borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: st.color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Breakdown Card */}
                <div className={styles.dashboardCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>Priority Severity Breakdown</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { priority: 'Critical', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
                      { priority: 'High', bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316' },
                      { priority: 'Medium', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
                      { priority: 'Low', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
                    ].map(p => {
                      const count = issues.filter(i => i.priority === p.priority).length;
                      return (
                        <div key={p.priority} style={{ padding: '14px', borderRadius: '10px', background: p.bg, border: `1px solid ${p.color}33`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: p.color, textTransform: 'uppercase' }}>{p.priority} Priority</span>
                          <span style={{ fontSize: '22px', fontWeight: 800, color: p.color }}>{count}</span>
                          <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor') }}>{issues.length > 0 ? Math.round((count / issues.length) * 100) : 0}% of workload</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Workload distribution */}
              {renderWorkloadChart()}
            </div>
          )}

          <div style={{ display: currentTab === 'documents' ? 'block' : 'none' }}>
            {(currentTab === 'documents' || hasOpenedDocuments) && (
              <ProjectDocumentsTab
                workspaceId={workspaceId}
                projectId={selectedProjectId}
                projectManagerId={currentProject?.projectManagerId}
                releases={releases}
                isShareMode={isShareMode}
                onSwitchTab={(tab, releaseId) => {
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.set('tab', tab);
                    if (releaseId) {
                      next.set('releaseId', releaseId);
                    }
                    return next;
                  });
                }}
              />
            )}
          </div>

          <div style={{ display: currentTab === 'blueprint' ? 'block' : 'none' }}>
            {(currentTab === 'blueprint' || hasOpenedBlueprint) && (
              <ProjectBlueprintTab
                workspaceId={workspaceId}
                projectId={selectedProjectId}
                releases={releases}
                isShareMode={isShareMode}
                isActive={currentTab === 'blueprint'}
              />
            )}
          </div>
        </div>

        {/* --- MODAL DIALOGS --- */}

        {/* Create Issue Modal */}
        {isIssueModalOpen && createPortal(
          <div className={styles.modalOverlay} onClick={() => setIsIssueModalOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Create New Work Item</h3>
                <button className={styles.closeBtn} onClick={() => setIsIssueModalOpen(false)}>
                  <CloseIconSvg />
                </button>
              </div>
              <form onSubmit={handleCreateIssueSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      placeholder="e.g. Implement user login flow"
                      value={issueForm.title}
                      onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Add details, steps to reproduce, or acceptance criteria..."
                      value={issueForm.description}
                      onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Type <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className={styles.select}
                        required
                        value={issueForm.type}
                        onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value })}
                      >
                        <option value="Task">Task</option>
                        <option value="Bug">Bug</option>
                        <option value="Feature">Feature</option>
                        <option value="Improvement">Improvement</option>
                        <option value="Research">Research</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Priority <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className={styles.select}
                        required
                        value={issueForm.priority}
                        onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Status <span style={{ color: '#ef4444' }}>*</span></label>
                      <select
                        className={styles.select}
                        required
                        value={issueForm.status}
                        onChange={(e) => setIssueForm({ ...issueForm, status: e.target.value })}
                      >
                        <option value="Backlog">Backlog</option>
                        <option value="Todo">Todo</option>
                        <option value="InProgress">In Progress</option>
                        <option value="InReview">In Review</option>
                        <option value="Testing">Testing</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Estimated Effort (Hours)</label>
                      <input
                        type="number"
                        className={styles.input}
                        min="0"
                        step="0.5"
                        value={issueForm.estimatedTime}
                        onChange={(e) => setIssueForm({ ...issueForm, estimatedTime: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Due Date</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={issueForm.dueDate}
                        onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Sprint/Cycle</label>
                      <select
                        className={styles.select}
                        value={issueForm.cycleId}
                        onChange={(e) => setIssueForm({ ...issueForm, cycleId: e.target.value })}
                      >
                        <option value="">None</option>
                        {cycles.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Functional Module</label>
                      <select
                        className={styles.select}
                        value={issueForm.moduleId}
                        onChange={(e) => setIssueForm({ ...issueForm, moduleId: e.target.value })}
                      >
                        <option value="">None</option>
                        {modules.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Release/Version</label>
                      <select
                        className={styles.select}
                        value={issueForm.releaseId}
                        onChange={(e) => setIssueForm({ ...issueForm, releaseId: e.target.value })}
                      >
                        <option value="">{releases.length === 0 ? 'No Version Release Available (Default)' : 'None'}</option>
                        {releases.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Assignees (Select to toggle)</label>
                    <div className={styles.multipleSelectArea}>
                      {workspaceMembers.map((member: any) => {
                        const isSelected = issueForm.assigneeIds.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className={styles.selectChip}
                            style={{
                              backgroundColor: isSelected ? `${cssVar('primaryColor')}22` : 'transparent',
                              border: isSelected ? `1px solid ${cssVar('primaryColor')}` : `1px solid ${cssVar('borderColor')}`,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (isSelected) {
                                setIssueForm({ ...issueForm, assigneeIds: issueForm.assigneeIds.filter(id => id !== member.id) });
                              } else {
                                setIssueForm({ ...issueForm, assigneeIds: [...issueForm.assigneeIds, member.id] });
                              }
                            }}
                          >
                            <span>{member.name || member.email}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsIssueModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                    Create Work Item
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Issue View Details Slider/Modal */}
        {selectedIssueIdForView && issueDetails && createPortal(
          <div className={styles.modalOverlay} onClick={() => { setSelectedIssueIdForView(''); setIsEditingIssue(false); }}>
            <div className={styles.modal} style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={styles.priorityBadge} style={{
                    backgroundColor: getPriorityColor(issueDetails.priority).bg,
                    color: getPriorityColor(issueDetails.priority).text,
                  }}>{issueDetails.priority}</span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{issueDetails.type}</span>
                  {isIssueFromBlueprint(issueDetails) && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(168, 85, 247, 0.08)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.15)',
                    }}>
                      Blueprint
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {!isEditingIssue && !isShareMode && (
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => setIsEditingIssue(true)}
                    >
                      <EditIconSvg /> Edit Work Item
                    </button>
                  )}
                  <button className={styles.closeBtn} onClick={() => { setSelectedIssueIdForView(''); setIsEditingIssue(false); }}>
                    <CloseIconSvg />
                  </button>
                </div>
              </div>

              {isEditingIssue ? (
                <form onSubmit={handleUpdateIssueSubmit}>
                  <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text"
                        className={styles.input}
                        required
                        value={editIssueForm.title}
                        onChange={(e) => setEditIssueForm({ ...editIssueForm, title: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Description</label>
                      <textarea
                        className={styles.textarea}
                        value={editIssueForm.description}
                        onChange={(e) => setEditIssueForm({ ...editIssueForm, description: e.target.value })}
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Type <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                          className={styles.select}
                          value={editIssueForm.type}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, type: e.target.value })}
                        >
                          <option value="Task">Task</option>
                          <option value="Bug">Bug</option>
                          <option value="Feature">Feature</option>
                          <option value="Improvement">Improvement</option>
                          <option value="Research">Research</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Priority <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                          className={styles.select}
                          value={editIssueForm.priority}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, priority: e.target.value })}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Status <span style={{ color: '#ef4444' }}>*</span></label>
                        <select
                          className={styles.select}
                          value={editIssueForm.status}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, status: e.target.value })}
                        >
                          <option value="Backlog">Backlog</option>
                          <option value="Todo">Todo</option>
                          <option value="InProgress">In Progress</option>
                          <option value="InReview">In Review</option>
                          <option value="Testing">Testing</option>
                          <option value="Done">Done</option>
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Estimated Effort (Hours)</label>
                        <input
                          type="number"
                          className={styles.input}
                          min="0"
                          step="0.5"
                          value={editIssueForm.estimatedTime}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, estimatedTime: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Due Date</label>
                        <input
                          type="date"
                          className={styles.input}
                          value={editIssueForm.dueDate}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, dueDate: e.target.value })}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Sprint/Cycle</label>
                        <select
                          className={styles.select}
                          value={editIssueForm.cycleId}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, cycleId: e.target.value })}
                        >
                          <option value="">None</option>
                          {cycles.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Functional Module</label>
                        <select
                          className={styles.select}
                          value={editIssueForm.moduleId}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, moduleId: e.target.value })}
                        >
                          <option value="">None</option>
                          {modules.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Release/Version</label>
                        <select
                          className={styles.select}
                          value={editIssueForm.releaseId}
                          onChange={(e) => setEditIssueForm({ ...editIssueForm, releaseId: e.target.value })}
                        >
                          <option value="">{releases.length === 0 ? 'No Version Release Created' : 'None'}</option>
                          {releases.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Assignees (Select to toggle)</label>
                      <div className={styles.multipleSelectArea}>
                        {workspaceMembers.map((member: any) => {
                          const isSelected = editIssueForm.assigneeIds.includes(member.id);
                          return (
                            <div
                              key={member.id}
                              className={styles.selectChip}
                              style={{
                                backgroundColor: isSelected ? `${cssVar('primaryColor')}22` : 'transparent',
                                border: isSelected ? `1px solid ${cssVar('primaryColor')}` : `1px solid ${cssVar('borderColor')}`,
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setEditIssueForm({ ...editIssueForm, assigneeIds: editIssueForm.assigneeIds.filter(id => id !== member.id) });
                                } else {
                                  setEditIssueForm({ ...editIssueForm, assigneeIds: [...editIssueForm.assigneeIds, member.id] });
                                }
                              }}
                            >
                              <span>{member.name || member.email}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={styles.modalFooter}>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ marginRight: 'auto' }}
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Delete Work Item',
                          message: 'Are you sure you want to delete this work item?',
                          targetId: issueDetails.id,
                          onConfirm: async (id) => {
                            if (!id) return;
                            await triggerDeleteIssue({ workspaceId, id });
                            setSelectedIssueIdForView('');
                            mutateQuery(projectIssuesQuery);
                          },
                        });
                      }}
                    >
                      Delete Work Item
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsEditingIssue(false)}>
                      Cancel Edit
                    </button>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.modalBody}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
                      {/* Left Main Content */}
                      <div>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: cssVar('textPrimaryColor'), lineHeight: 1.3 }}>
                          {issueDetails.title}
                        </h2>

                        <div style={{
                          backgroundColor: cssVar('backgroundSecondaryColor'),
                          borderRadius: '12px',
                          padding: '20px',
                          border: `1px solid ${cssVar('borderColor')}`,
                          marginBottom: '24px'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Description</span>
                          <div style={{ fontSize: '14px', lineHeight: '1.6', color: issueDetails.description ? cssVar('textPrimaryColor') : cssVar('textSecondaryColor') }}>
                            {issueDetails.description ? (
                              <MarkdownRenderer text={issueDetails.description} />
                            ) : (
                              <em style={{ color: '#94a3b8' }}>No description provided for this work item.</em>
                            )}
                          </div>
                        </div>

                        {/* Issue Comments */}
                        <div className={styles.commentsSection} style={{ borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '20px', marginTop: 0 }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Comment Thread</span>
                            <span style={{ fontSize: '11px', backgroundColor: cssVar('hoverColor'), padding: '2px 8px', borderRadius: '10px', color: cssVar('textSecondaryColor') }}>{comments.length}</span>
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                            {comments.map(c => (
                              <div key={c.id} className={styles.commentBubble} style={{ background: cssVar('backgroundSecondaryColor'), borderRadius: '10px', padding: '12px 16px', border: `1px solid ${cssVar('borderColor')}` }}>
                                <div className={styles.commentHeader} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                                  <strong style={{ color: cssVar('textPrimaryColor'), fontWeight: 600 }}>{c.user?.name || c.user?.email || 'Team Member'}</strong>
                                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <div className={styles.commentText} style={{ fontSize: '13px', color: cssVar('textPrimaryColor') }}>
                                  <MarkdownRenderer text={c.content} />
                                </div>
                              </div>
                            ))}
                            {comments.length === 0 && (
                              <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '13px', padding: '20px', background: cssVar('backgroundSecondaryColor'), borderRadius: '8px', border: `1px dashed ${cssVar('borderColor')}` }}>No comments yet. Start the conversation!</div>
                            )}
                          </div>

                          {!isShareMode && (
                            <form onSubmit={handleAddComment} className={styles.commentInputArea} style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center', width: '100%' }}>
                              <input
                                type="text"
                                placeholder="Write a comment..."
                                className={styles.input}
                                style={{ flex: 1, height: '38px' }}
                                value={newCommentContent}
                                onChange={(e) => setNewCommentContent(e.target.value)}
                              />
                              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ height: '38px', padding: '0 20px', whiteSpace: 'nowrap' }}>
                                Comment
                              </button>
                            </form>
                          )}
                        </div>
                      </div>

                      {/* Right Sidebar Properties Card */}
                      <div style={{
                        backgroundColor: cssVar('backgroundSecondaryColor'),
                        borderRadius: '12px',
                        padding: '18px',
                        border: `1px solid ${cssVar('borderColor')}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Properties</span>

                        <div>
                          <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '6px', fontWeight: 600 }}>Status</span>
                          {isShareMode ? (
                            <span className={styles.statusBadge} style={{
                              backgroundColor: getStatusColor(issueDetails.status).bg,
                              color: getStatusColor(issueDetails.status).text,
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '4px 12px',
                              borderRadius: '12px',
                              display: 'inline-block'
                            }}>
                              {issueDetails.status}
                            </span>
                          ) : (
                            <select
                              className={styles.select}
                              style={{ width: '100%', height: '38px', fontSize: '13px' }}
                              value={issueDetails.status}
                              onChange={(e) => handleUpdateIssueStatus(issueDetails.id, e.target.value)}
                            >
                              <option value="Backlog">Backlog</option>
                              <option value="Todo">Todo</option>
                              <option value="InProgress">In Progress</option>
                              <option value="InReview">In Review</option>
                              <option value="Testing">Testing</option>
                              <option value="Done">Done</option>
                            </select>
                          )}
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '6px', fontWeight: 600 }}>Assignees</span>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {issueDetails.assignees && issueDetails.assignees.length > 0 ? (
                              issueDetails.assignees.map((a: any) => (
                                <span key={a.userId} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: cssVar('hoverColor'), border: `1px solid ${cssVar('borderColor')}`, padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 500, color: cssVar('textPrimaryColor') }}>
                                  {a.user?.name || a.user?.email}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                            )}
                          </div>
                        </div>

                        {[
                          { label: 'Reporter', value: issueDetails.reporter?.name || issueDetails.reporter?.email || 'N/A' },
                          { label: 'Priority', value: issueDetails.priority },
                          { label: 'Type', value: issueDetails.type },
                          { label: 'Estimated Effort', value: issueDetails.estimatedTime ? `${issueDetails.estimatedTime} hrs` : 'None' },
                          { label: 'Sprint / Cycle', value: issueDetails.cycle?.name || 'None' },
                          { label: 'Functional Module', value: issueDetails.module?.name || 'None' },
                          { label: 'Product Release', value: issueDetails.release?.name || 'None' },
                          { label: 'Due Date', value: issueDetails.dueDate ? new Date(issueDetails.dueDate).toLocaleDateString() : 'None' },
                        ].map((meta, index) => (
                          <div key={index} style={{ borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: cssVar('textSecondaryColor'), textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>{meta.label}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>{meta.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.modalFooter}>
                    {!isShareMode && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        style={{ marginRight: 'auto' }}
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Work Item',
                            message: 'Are you sure you want to delete this work item?',
                            targetId: issueDetails.id,
                            onConfirm: async (id) => {
                              if (!id) return;
                              await triggerDeleteIssue({ workspaceId, id });
                              setSelectedIssueIdForView('');
                              mutateQuery(projectIssuesQuery);
                            },
                          });
                        }}
                      >
                        Delete Work Item
                      </button>
                    )}
                    <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setSelectedIssueIdForView('')}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Create Cycle Modal */}
        {isCycleModalOpen && createPortal(
          <div className={styles.modalOverlay} onClick={() => {
            setIsCycleModalOpen(false);
            setEditingCycleId(null);
            setCycleForm({ name: '', goal: '', startDate: '', endDate: '', status: 'Planned' });
          }}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {editingCycleId ? 'Modify Project Cycle' : 'Create Project Cycle (Sprint)'}
                </h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => {
                    setIsCycleModalOpen(false);
                    setEditingCycleId(null);
                    setCycleForm({ name: '', goal: '', startDate: '', endDate: '', status: 'Planned' });
                  }}
                >
                  <CloseIconSvg />
                </button>
              </div>
              <form onSubmit={handleCreateCycleSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cycle Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      placeholder="e.g. Cycle 1, Sprint 23"
                      value={cycleForm.name}
                      onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Goal / Focus</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Deliver critical MVP authorization features"
                      value={cycleForm.goal}
                      onChange={(e) => setCycleForm({ ...cycleForm, goal: e.target.value })}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="date"
                        className={styles.input}
                        required
                        value={cycleForm.startDate}
                        onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>End Date <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="date"
                        className={styles.input}
                        required
                        value={cycleForm.endDate}
                        onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.select}
                      value={cycleForm.status}
                      onChange={(e) => setCycleForm({ ...cycleForm, status: e.target.value })}
                    >
                      <option value="Planned">Planned</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      setIsCycleModalOpen(false);
                      setEditingCycleId(null);
                      setCycleForm({ name: '', goal: '', startDate: '', endDate: '', status: 'Planned' });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                    {editingCycleId ? 'Save Changes' : 'Create Cycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Create / Edit Release Modal */}
        {isReleaseModalOpen && createPortal(
          <div className={styles.modalOverlay} onClick={() => {
            setIsReleaseModalOpen(false);
            setEditingReleaseId(null);
            setReleaseForm({ name: '', description: '', plannedDate: '', status: 'Planned' });
          }}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {editingReleaseId ? 'Modify Product Release' : 'Create Product Release'}
                </h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => {
                    setIsReleaseModalOpen(false);
                    setEditingReleaseId(null);
                    setReleaseForm({ name: '', description: '', plannedDate: '', status: 'Planned' });
                  }}
                >
                  <CloseIconSvg />
                </button>
              </div>
              <form onSubmit={handleCreateReleaseSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Version / Release Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      placeholder="e.g. v1.0.0-beta, Release v2.1"
                      value={releaseForm.name}
                      onChange={(e) => setReleaseForm({ ...releaseForm, name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Description / Release Notes</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Add high-level release description or target goals..."
                      value={releaseForm.description}
                      onChange={(e) => setReleaseForm({ ...releaseForm, description: e.target.value })}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Planned Release Date <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="date"
                        className={styles.input}
                        required
                        value={releaseForm.plannedDate}
                        onChange={(e) => setReleaseForm({ ...releaseForm, plannedDate: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Status</label>
                      <select
                        className={styles.select}
                        value={releaseForm.status}
                        onChange={(e) => setReleaseForm({ ...releaseForm, status: e.target.value })}
                      >
                        <option value="Planned">Planned</option>
                        <option value="InDevelopment">In Development</option>
                        <option value="Testing">Testing</option>
                        <option value="Released">Released</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      setIsReleaseModalOpen(false);
                      setEditingReleaseId(null);
                      setReleaseForm({ name: '', description: '', plannedDate: '', status: 'Planned' });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                    {editingReleaseId ? 'Save Changes' : 'Create Release'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Create Module Modal */}
        {isModuleModalOpen && createPortal(
          <div className={styles.modalOverlay} onClick={() => setIsModuleModalOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Create Functional Module</h3>
                <button className={styles.closeBtn} onClick={() => setIsModuleModalOpen(false)}>
                  <CloseIconSvg />
                </button>
              </div>
              <form onSubmit={handleCreateModuleSubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Module Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="text"
                      className={styles.input}
                      required
                      placeholder="e.g. Authentication, Billing, Search"
                      value={moduleForm.name}
                      onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Describe the scope of this functional module..."
                      value={moduleForm.description}
                      onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Lead Owner</label>
                    <select
                      className={styles.select}
                      value={moduleForm.leadId}
                      onChange={(e) => setModuleForm({ ...moduleForm, leadId: e.target.value })}
                    >
                      <option value="">Select Module Lead...</option>
                      {workspaceMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsModuleModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                    Create Module
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
      {/* Share Space/Project Modal */}
      {renderShareModal()}
      </ViewBody>
      </>
    );
  }

  // Projects List View
  return (
    <>
      <ViewTitle title="Projects" />
      <ViewIcon icon="collection" />
      <ViewHeader>
        <Header
          left={
            <div ref={categoryMenuRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    updateCategoryMenuPos();
                    setIsCategoryMenuOpen(prev => !prev);
                  }}
                  style={{
                    border: `1px solid ${cssVar('borderColor')}`,
                    borderRadius: '8px',
                    backgroundColor: cssVar('backgroundPrimaryColor'),
                    height: '32px',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: cssVar('textPrimaryColor'),
                    userSelect: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    style={{ userSelect: 'none', flexShrink: 0, color: cssVar('textSecondaryColor') }}
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25m-4 6.5a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5zm.25 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75M11 14.75a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Domain: {selectedCategory}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

              {isCategoryMenuOpen && createPortal(
                <div
                  ref={menuDropdownRef}
                  style={{
                    position: 'fixed',
                    top: `${categoryMenuPos.top}px`,
                    left: `${categoryMenuPos.left}px`,
                    zIndex: 99999,
                    minWidth: '220px',
                    backgroundColor: cssVar('backgroundPrimaryColor'),
                    border: `1px solid ${cssVar('borderColor')}`,
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                  }}
                >
                  <div>
                    <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: cssVar('textSecondaryColor'), letterSpacing: '0.05em' }}>
                      Select Domain Category
                    </div>
                    {['All', ...customCategories].map(cat => {
                      const count = getCategoryProjectCount(cat);
                      const isSelected = selectedCategory === cat;
                      return (
                        <div
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsCategoryMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 400,
                            backgroundColor: isSelected ? cssVar('hoverColor') : 'transparent',
                            cursor: 'pointer',
                            color: isSelected ? cssVar('primaryColor') : cssVar('textPrimaryColor'),
                          }}
                        >
                          <span>{cat}</span>
                          <span style={{ fontSize: '11px', opacity: 0.7, backgroundColor: cssVar('hoverColor'), padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>,
                document.body
              )}
            </div>
          }
          center={
            <RadioGroup
              style={{ maxWidth: '100%', width: 480 }}
              value={projectStatusFilter}
              onChange={(val) => setProjectStatusFilter(val as any)}
              items={statusFilterRadioItems}
            />
          }
          right={
            !isShareMode ? (
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => handleOpenShareModal(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span>Share Space</span>
              </button>
            ) : null
          }
        />
      </ViewHeader>
      <ViewBody>
        <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: cssVar('primaryColor') }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Projects Space</span>
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Dashboard Search Input */}
            <div className={styles.searchBar} style={{ width: '240px' }}>
              <span className={styles.searchIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {!isShareMode ? (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenCreateProject} style={{ background: '#0f62fe' }}>
                <PlusIconSvg /> New Project
              </button>
            ) : (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#a855f7',
                  background: 'rgba(168, 85, 247, 0.1)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                }}
              >
                Guest View-Only
              </span>
            )}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Create and track multiple projects, tasks, sprints, modules, and version releases for this workspace.
        </p>
      </div>

      <div className={styles.bodyContent}>
        <div className={styles.projectGrid}>
          {filteredProjects.map(proj => (
            <div
              key={proj.id}
              className={styles.projectCard}
              onClick={() => handleSelectProject(proj.id)}
              style={{ '--project-color': proj.color || '#3b82f6' } as React.CSSProperties}
            >
              <div className={styles.projectCardBanner} style={{ backgroundColor: proj.color || '#3b82f6' }} />
              <div className={styles.projectCardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {proj.icon && <span style={{ fontSize: '20px' }}>{proj.icon}</span>}
                  <h3 className={styles.projectCardTitle}>{proj.name}</h3>
                </div>
                {!isShareMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditProject(proj);
                    }}
                    title="Edit Project Settings"
                    style={{
                      background: 'rgba(15, 98, 254, 0.08)',
                      color: '#0f62fe',
                      border: '1px solid rgba(15, 98, 254, 0.2)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease-in-out',
                      zIndex: 2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#0f62fe';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(15, 98, 254, 0.08)';
                      e.currentTarget.style.color = '#0f62fe';
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <p className={styles.projectCardDesc}>{proj.description || 'No description added yet.'}</p>
              <div className={styles.projectCardFooter}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={styles.statusBadge} style={{
                    backgroundColor: proj.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                    color: proj.status === 'Active' ? '#10b981' : '#94a3b8',
                    padding: '2px 6px',
                  }}>
                    {proj.status}
                  </span>
                  {proj.category && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}>
                      {proj.category}
                    </span>
                  )}
                </div>
                <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className={styles.boardColumnEmpty} style={{ gridColumn: '1 / -1', padding: '64px' }}>
              <h3>No Projects Found</h3>
              <p>{isShareMode ? 'No projects are currently shared or available in this space.' : 'Get started by creating a new project tracking space for your team.'}</p>
              {!isShareMode && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenCreateProject} style={{ marginTop: '12px', background: '#0f62fe' }}>
                  <PlusIconSvg /> Create First Project
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {isProjectModalOpen && createPortal(
        <div className={styles.modalOverlay} onClick={() => setIsProjectModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingProject ? 'Edit Project Settings' : 'Create New Project'}</h3>
              <button className={styles.closeBtn} onClick={() => setIsProjectModalOpen(false)}>
                <CloseIconSvg />
              </button>
            </div>
            <form onSubmit={handleCreateProjectSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Project Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    required
                    placeholder="e.g. IntoAI Mobile App, Website Redesign"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Provide a high-level summary of the project scope and goals..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Accent Color</label>
                    <input
                      type="color"
                      className={styles.input}
                      style={{ padding: '2px', height: '40px', cursor: 'pointer' }}
                      value={projectForm.color}
                      onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Project Status <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      className={styles.select}
                      required
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    >
                      <option value="Planning">Planning</option>
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Category</label>
                  <select
                    className={styles.select}
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                  >
                    <option value="">Select Category (Optional)</option>
                    {customCategories.map((cat: string) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Project Manager <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className={styles.select}
                    required
                    value={projectForm.projectManagerId}
                    onChange={(e) => {
                      const pmUser = workspaceMembers.find((m: any) => m.id === e.target.value);
                      setProjectForm({
                        ...projectForm,
                        projectManagerId: e.target.value,
                        projectManagerName: pmUser ? (pmUser.name || pmUser.email || '') : '',
                      });
                    }}
                  >
                    <option value="">Select Project Manager (Required)</option>
                    {workspaceMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Visibility & Scoping <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className={styles.select}
                    required
                    value={projectForm.visibility}
                    onChange={(e) => setProjectForm({ ...projectForm, visibility: e.target.value })}
                  >
                    <option value="WorkspaceWide">Workspace-wide (All workspace members can view & edit)</option>
                    <option value="Restricted">Restricted (Only explicitly scoped members can access)</option>
                  </select>
                </div>

                {projectForm.visibility === 'Restricted' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Select Scoped Members (Select to toggle)</label>
                    <div className={styles.multipleSelectArea}>
                      {workspaceMembers.map((member: any) => {
                        const isSelected = projectForm.restrictedMembers.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            className={styles.selectChip}
                            style={{
                              backgroundColor: isSelected ? `${cssVar('primaryColor')}22` : 'transparent',
                              border: isSelected ? `1px solid ${cssVar('primaryColor')}` : `1px solid ${cssVar('borderColor')}`,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (isSelected) {
                                setProjectForm({
                                  ...projectForm,
                                  restrictedMembers: projectForm.restrictedMembers.filter(id => id !== member.id),
                                });
                              } else {
                                setProjectForm({
                                  ...projectForm,
                                  restrictedMembers: [...projectForm.restrictedMembers, member.id],
                                });
                              }
                            }}
                          >
                            <span>{member.name || member.email}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsProjectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ background: '#0f62fe' }}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Reusable Premium Confirmation Modal */}
      {confirmDialog.isOpen && createPortal(
        <div className={styles.modalOverlay} onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
          <div className={styles.modal} style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{confirmDialog.title}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                <CloseIconSvg />
              </button>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px 24px', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: cssVar('textSecondaryColor') }}>
                {confirmDialog.message}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={async () => {
                  try {
                    await confirmDialog.onConfirm(confirmDialog.targetId);
                  } catch (err) {
                    console.error('Action execution failed:', err);
                  } finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
      {/* Share Space/Project Modal */}
      {renderShareModal()}
      </ViewBody>
    </>
  );
};
