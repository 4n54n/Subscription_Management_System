import React, { useState } from 'react';
import { cssVar } from '@toeverything/theme';
import { useWorkspaceCopilot } from './copilot-context-provider';

export interface PendingActionPayload {
  action: string;
  data: Record<string, any>;
  summary?: string;
}

interface ActionConfirmationCardProps {
  pendingAction: PendingActionPayload;
  onConfirm: (action: string, data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isExecuting?: boolean;
}

export const ActionConfirmationCard: React.FC<ActionConfirmationCardProps> = ({
  pendingAction,
  onConfirm,
  onCancel,
  isExecuting = false,
}) => {
  const { copilotContext } = useWorkspaceCopilot();
  const [editableData, setEditableData] = useState<Record<string, any>>({ ...pendingAction.data });
  const [isEditing, setIsEditing] = useState(false);

  const handleFieldChange = (key: string, val: string) => {
    setEditableData(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const actionNameFormatted = pendingAction.action.replace('_', ' ');

  const renderFieldInput = (key: string, value: any) => {
    const lowercaseKey = key.toLowerCase();

    // System IDs (Read-Only)
    if (['id', 'projectid', 'issueid', 'docid'].includes(lowercaseKey)) {
      return (
        <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), fontStyle: 'italic' }}>
          {String(value)} (System ID)
        </span>
      );
    }

    // Work Item / Task Status
    if (key === 'status' && (pendingAction.action.includes('ISSUE') || pendingAction.action.includes('WORK_ITEM'))) {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="Backlog">Backlog</option>
          <option value="Todo">To Do</option>
          <option value="InProgress">In Progress</option>
          <option value="InReview">In Review</option>
          <option value="Testing">Testing</option>
          <option value="Done">Done</option>
        </select>
      );
    }

    // Priority
    if (key === 'priority') {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      );
    }

    // Type
    if (key === 'type') {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="Task">Task</option>
          <option value="Bug">Bug</option>
          <option value="Feature">Feature</option>
          <option value="Improvement">Improvement</option>
        </select>
      );
    }

    // Cycle Status
    if (key === 'status' && pendingAction.action.includes('CYCLE')) {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="Planned">Planned</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
      );
    }

    // Release Status
    if (key === 'status' && pendingAction.action.includes('RELEASE')) {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="Planned">Planned</option>
          <option value="InDevelopment">In Development</option>
          <option value="Testing">Testing</option>
          <option value="Released">Released</option>
        </select>
      );
    }

    // Project Manager Dropdown
    if (key === 'projectManagerName' || key === 'projectManagerId') {
      const members = copilotContext.workspaceMembers || [];
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="">-- Select Project Manager --</option>
          {members.map((m: any) => (
            <option key={m.id} value={key === 'projectManagerId' ? m.id : (m.name || m.email)}>
              {m.name || m.email}
            </option>
          ))}
        </select>
      );
    }

    // Category Dropdown
    if (key === 'category') {
      const categories = copilotContext.categories && copilotContext.categories.length
        ? copilotContext.categories
        : ['Engineering', 'Design', 'Research', 'Operations', 'Product', 'Marketing'];
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="">-- Select Category --</option>
          {categories.map((c: string) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      );
    }

    // Assignee / Lead Name Dropdown
    if (key === 'assigneeName' || key === 'leadName') {
      const members = copilotContext.workspaceMembers || [];
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="">-- Select Member --</option>
          {members.map((m: any) => (
            <option key={m.id || m.name} value={m.name || m.email}>
              {m.name || m.email}
            </option>
          ))}
        </select>
      );
    }

    // Cycle Name Dropdown
    if (key === 'cycleName') {
      const cycles = copilotContext.cycles || [];
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="">-- None --</option>
          {cycles.map((c: any) => (
            <option key={c.id || c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }

    // Module Name Dropdown
    if (key === 'moduleName') {
      const modules = copilotContext.modules || [];
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="">-- None --</option>
          {modules.map((m: any) => (
            <option key={m.id || m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      );
    }

    // Release Name Dropdown
    if (key === 'releaseName') {
      const releases = copilotContext.releases || [];
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="">-- None --</option>
          {releases.map((r: any) => (
            <option key={r.id || r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      );
    }

    // Visibility
    if (key === 'visibility') {
      return (
        <select
          value={String(value) === 'Public' ? 'WorkspaceWide' : String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="WorkspaceWide">Workspace-wide (Unrestricted)</option>
          <option value="Restricted">Restricted</option>
        </select>
      );
    }

    // Blueprint Node Role
    if (key === 'role') {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="agent">Agent</option>
          <option value="tool">Tool</option>
          <option value="router">Router</option>
          <option value="input">Input</option>
          <option value="output">Output</option>
        </select>
      );
    }

    // Blueprint Action Type
    if (key === 'actionType') {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="ADD_NODE">Add Node</option>
          <option value="UPDATE_NODE">Update Node</option>
          <option value="DELETE_NODE">Delete Node</option>
          <option value="ADD_CONTAINER">Add Container</option>
        </select>
      );
    }

    // Document Edit Mode
    if (key === 'editMode') {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          style={{ flex: 1, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '11px', background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor') }}
        >
          <option value="REWRITE_BLOCK">Rewrite Block</option>
          <option value="APPEND_SECTION">Append Section</option>
          <option value="INSERT_TABLE">Insert Table</option>
          <option value="REPLACE_CONTENT">Replace Content</option>
          <option value="SUMMARIZE">Summarize</option>
        </select>
      );
    }

    // Multiline Text Body (Description, Content, Goal)
    if (['description', 'newcontent', 'goal', 'content', 'summary'].includes(lowercaseKey)) {
      return (
        <textarea
          value={String(value)}
          onChange={e => handleFieldChange(key, e.target.value)}
          rows={3}
          style={{
            flex: 1,
            padding: '4px 6px',
            borderRadius: '4px',
            border: `1px solid ${cssVar('borderColor')}`,
            fontSize: '11px',
            fontFamily: 'inherit',
            background: cssVar('backgroundSecondaryColor'),
            color: cssVar('textPrimaryColor'),
            resize: 'vertical',
          }}
        />
      );
    }

    // Default Input
    return (
      <input
        type={lowercaseKey.includes('date') ? 'date' : lowercaseKey.includes('time') ? 'number' : 'text'}
        value={String(value)}
        onChange={e => handleFieldChange(key, e.target.value)}
        style={{
          flex: 1,
          padding: '2px 6px',
          borderRadius: '4px',
          border: `1px solid ${cssVar('borderColor')}`,
          fontSize: '11px',
          background: cssVar('backgroundSecondaryColor'),
          color: cssVar('textPrimaryColor'),
        }}
      />
    );
  };

  return (
    <div
      style={{
        marginTop: '10px',
        padding: '12px 14px',
        borderRadius: '8px',
        background: 'rgba(15, 98, 254, 0.04)',
        border: '1px solid rgba(15, 98, 254, 0.2)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontSize: '13px',
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              background: '#0f62fe',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '3px',
            }}
          >
            Action confirmation
          </span>
          <span style={{ fontWeight: 600, color: cssVar('textPrimaryColor'), fontSize: '13px' }}>
            {actionNameFormatted.toLowerCase()}
          </span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            background: 'none',
            border: 'none',
            color: '#0f62fe',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
            textDecoration: 'underline',
          }}
        >
          {isEditing ? 'Done editing' : 'Edit parameters'}
        </button>
      </div>

      {/* Summary string */}
      {pendingAction.summary && (
        <div style={{ color: cssVar('textSecondaryColor'), fontStyle: 'italic', fontSize: '12px' }}>
          {pendingAction.summary}
        </div>
      )}

      {/* Payload parameters view / edit */}
      <div
        style={{
          background: cssVar('backgroundPrimaryColor'),
          border: `1px solid ${cssVar('borderColor')}`,
          borderRadius: '6px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '180px',
          overflowY: 'auto',
        }}
      >
        {Object.entries(editableData).map(([key, value]) => {
          if (value === undefined || value === null) return null;
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', fontWeight: 500, color: cssVar('textSecondaryColor'), minWidth: '90px' }}>
                {key}:
              </span>
              {isEditing ? (
                renderFieldInput(key, value)
              ) : (
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    color: cssVar('textPrimaryColor'),
                    fontWeight: 400,
                  }}
                >
                  {(() => {
                    const lowerKey = key.toLowerCase();
                    const members = copilotContext.workspaceMembers || [];
                    if (lowerKey === 'restrictedmembers' || lowerKey.includes('members')) {
                      if (Array.isArray(value)) {
                        const names = value.map(idOrName => {
                          const found = members.find((m: any) => m.id === idOrName);
                          return found ? (found.name || found.email || idOrName) : idOrName;
                        });
                        return names.length ? names.join(', ') : 'None';
                      }
                    }
                    if (lowerKey === 'projectmanagerid' || lowerKey === 'leadid' || lowerKey === 'assigneeid') {
                      const found = members.find((m: any) => m.id === value);
                      return found ? (found.name || found.email || value) : String(value);
                    }
                    if (Array.isArray(value)) {
                      return value.length ? value.join(', ') : 'None';
                    }
                    return String(value);
                  })()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm & Cancel Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
        <button
          onClick={() => onConfirm(pendingAction.action, editableData)}
          disabled={isExecuting}
          style={{
            flex: 1,
            padding: '8px 14px',
            background: isExecuting ? cssVar('borderColor') : '#0f62fe',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            fontSize: '12px',
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
        >
          {isExecuting ? 'Executing...' : 'Confirm and execute'}
        </button>
        <button
          onClick={onCancel}
          disabled={isExecuting}
          style={{
            flex: 1,
            padding: '8px 14px',
            background: 'rgba(218, 30, 40, 0.06)',
            color: '#da1e28',
            border: '1px solid rgba(218, 30, 40, 0.2)',
            borderRadius: '6px',
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 500,
            fontSize: '12px',
            cursor: isExecuting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
