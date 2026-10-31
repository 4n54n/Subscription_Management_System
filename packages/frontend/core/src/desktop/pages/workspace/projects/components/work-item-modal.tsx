import React from 'react';
import { cssVar } from '@toeverything/theme';
import { Portal } from './portal';
import { CloseIconSvg, EditIconSvg } from './icons';
import { getPriorityColor, getStatusColor } from '../utils/project-helpers';
import * as styles from '../styles.css';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueForm: any;
  setIssueForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  cycles: any[];
  modules: any[];
  releases: any[];
  workspaceMembers: any[];
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  issueForm,
  setIssueForm,
  onSubmit,
  cycles,
  modules,
  releases,
  workspaceMembers,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Create New Work Item</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
              <CloseIconSvg />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Title</label>
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
                  <label className={styles.label}>Type</label>
                  <select
                    className={styles.select}
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
                  <label className={styles.label}>Priority</label>
                  <select
                    className={styles.select}
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
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
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
                    <option value="">None</option>
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
                            setIssueForm({ ...issueForm, assigneeIds: issueForm.assigneeIds.filter((id: string) => id !== member.id) });
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Create Work Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

interface IssueDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueDetails: any;
  isEditingIssue: boolean;
  setIsEditingIssue: (val: boolean) => void;
  editIssueForm: any;
  setEditIssueForm: (form: any) => void;
  isIssueFromBlueprint: (issue: any) => boolean;
  isShareMode: boolean;
  handleUpdateIssueSubmit: (e: React.FormEvent) => void;
  handleUpdateIssueStatus: (id: string, status: string) => void;
  comments: any[];
  newCommentContent: string;
  setNewCommentContent: (val: string) => void;
  handleAddComment: (e: React.FormEvent) => void;
  workspaceMembers: any[];
  cycles: any[];
  modules: any[];
  releases: any[];
  onDeleteIssue: () => void;
}

export const IssueDetailsModal: React.FC<IssueDetailsModalProps> = ({
  isOpen,
  onClose,
  issueDetails,
  isEditingIssue,
  setIsEditingIssue,
  editIssueForm,
  setEditIssueForm,
  isIssueFromBlueprint,
  isShareMode,
  handleUpdateIssueSubmit,
  handleUpdateIssueStatus,
  comments,
  newCommentContent,
  setNewCommentContent,
  handleAddComment,
  workspaceMembers,
  cycles,
  modules,
  releases,
  onDeleteIssue,
}) => {
  if (!isOpen || !issueDetails) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onClose}>
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
                  background: 'rgba(30, 136, 229, 0.08)',
                  color: '#1e88e5',
                  border: '1px solid rgba(30, 136, 229, 0.15)',
                }}>
                  Blueprint
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!isEditingIssue && !isShareMode && (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setIsEditingIssue(true)}
                >
                  <EditIconSvg /> Edit Work Item
                </button>
              )}
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
                <CloseIconSvg />
              </button>
            </div>
          </div>

          {isEditingIssue ? (
            <form onSubmit={handleUpdateIssueSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
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
                    <label className={styles.label}>Type</label>
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
                    <label className={styles.label}>Priority</label>
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
                    <label className={styles.label}>Status</label>
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
                      <option value="">None</option>
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
                              setEditIssueForm({ ...editIssueForm, assigneeIds: editIssueForm.assigneeIds.filter((id: string) => id !== member.id) });
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
                  onClick={onDeleteIssue}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px 0' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{issueDetails.title}</h2>
                  {isIssueFromBlueprint(issueDetails) && (
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
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Status:</span>
                  {isShareMode ? (
                    <span className={styles.statusBadge} style={{
                      backgroundColor: getStatusColor(issueDetails.status).bg,
                      color: getStatusColor(issueDetails.status).text,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '4px 12px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      borderRadius: '12px',
                    }}>
                      {issueDetails.status === 'InProgress' ? 'In Progress' : issueDetails.status === 'InReview' ? 'In Review' : issueDetails.status}
                    </span>
                  ) : (
                    <select
                      className={styles.select}
                      style={{ padding: '4px 8px', fontSize: '13px' }}
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

                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '16px', border: `1px solid ${cssVar('borderColor')}`, fontSize: '14px', lineHeight: 1.5, minHeight: '80px', whiteSpace: 'pre-wrap' }}>
                  {issueDetails.description || 'No description provided for this work item.'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', fontSize: '13px' }}>
                  <div>Reporter: <strong>{issueDetails.reporter?.name || issueDetails.reporter?.email || 'N/A'}</strong></div>
                  <div>Estimated Time: <strong>{issueDetails.estimatedTime ? `${issueDetails.estimatedTime}h` : 'None'}</strong></div>
                  <div>Sprint: <strong>{issueDetails.cycle?.name || 'None'}</strong></div>
                  <div>Module: <strong>{issueDetails.module?.name || 'None'}</strong></div>
                  <div>Release: <strong>{issueDetails.release?.name || 'None'}</strong></div>
                  <div>Due Date: <strong>{issueDetails.dueDate ? new Date(issueDetails.dueDate).toLocaleDateString() : 'None'}</strong></div>
                </div>

                {/* Subtask listing */}
                <div style={{ marginTop: '20px', borderTop: `1px solid ${cssVar('borderColor')}`, paddingTop: '16px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '8px' }}>Assignees</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {issueDetails.assignees && issueDetails.assignees.length > 0 ? (
                      issueDetails.assignees.map((a: any) => (
                        <span key={a.userId} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: cssVar('hoverColor'), border: `1px solid ${cssVar('borderColor')}`, padding: '4px 10px', borderRadius: '15px', fontSize: '12px', color: cssVar('textPrimaryColor') }}>
                          {a.user?.name || a.user?.email}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Issue Comments */}
                <div className={styles.commentsSection}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Comment Thread</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {comments.map(c => (
                      <div key={c.id} className={styles.commentBubble}>
                        <div className={styles.commentHeader}>
                          <strong style={{ color: '#1e293b' }}>{c.user?.name || c.user?.email}</strong>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div className={styles.commentText}>{c.content}</div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '13px', padding: '16px' }}>No comments yet. Start the conversation!</div>
                    )}
                  </div>

                  {!isShareMode && (
                    <form onSubmit={handleAddComment} className={styles.commentInputArea}>
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        className={styles.input}
                        style={{ flex: 1 }}
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                      />
                      <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                        Comment
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                {!isShareMode && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    style={{ marginRight: 'auto' }}
                    onClick={onDeleteIssue}
                  >
                    Delete Work Item
                  </button>
                )}
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
};

interface CreateCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleForm: any;
  setCycleForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateCycleModal: React.FC<CreateCycleModalProps> = ({
  isOpen,
  onClose,
  cycleForm,
  setCycleForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Create Project Cycle (Sprint)</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
              <CloseIconSvg />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cycle Name</label>
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
                  <label className={styles.label}>Start Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    required
                    value={cycleForm.startDate}
                    onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>End Date</label>
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Create Cycle
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

interface CreateReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReleaseId: string | null;
  releaseForm: any;
  setReleaseForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateReleaseModal: React.FC<CreateReleaseModalProps> = ({
  isOpen,
  onClose,
  editingReleaseId,
  releaseForm,
  setReleaseForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              {editingReleaseId ? 'Modify Product Release' : 'Create Product Release'}
            </h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
              <CloseIconSvg />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Version / Release Name</label>
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
                  <label className={styles.label}>Planned Release Date</label>
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                {editingReleaseId ? 'Save Changes' : 'Create Release'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleForm: any;
  setModuleForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  workspaceMembers: any[];
}

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({
  isOpen,
  onClose,
  moduleForm,
  setModuleForm,
  onSubmit,
  workspaceMembers,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Create Functional Module</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
              <CloseIconSvg />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Module Name</label>
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Create Module
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectForm: any;
  setProjectForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  workspaceMembers: any[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  projectForm,
  setProjectForm,
  onSubmit,
  workspaceMembers,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Create New Project</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
              <CloseIconSvg />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Project Name</label>
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
                  <label className={styles.label}>Project Status</label>
                  <select
                    className={styles.select}
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
                <label className={styles.label}>Visibility & Scoping</label>
                <select
                  className={styles.select}
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
                                restrictedMembers: projectForm.restrictedMembers.filter((id: string) => id !== member.id),
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
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className={styles.modalOverlay} onClick={onCancel}>
        <div className={styles.modal} style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>{title}</h3>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={onCancel}
            >
              <CloseIconSvg />
            </button>
          </div>
          <div className={styles.modalBody} style={{ padding: '20px 24px', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: cssVar('textSecondaryColor') }}>
              {message}
            </p>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={async () => {
                try {
                  await onConfirm();
                } catch (err) {
                  console.error('Action execution failed:', err);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
