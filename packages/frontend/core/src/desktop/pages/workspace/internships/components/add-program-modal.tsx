import { CURRENCY_OPTIONS } from './currencies';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { cssVar } from '@toeverything/theme';
import * as styles from '../../proposals/styles.css';
import { CloseIconSvg } from './icons';

export interface ProgramData {
  id?: number;
  program_code: string;
  program_name: string;
  category: string;
  description: string;
  skills: string;
  learning_outcomes: string;
  duration: string;
  mode: string;
  mentor_name: string;
  mentor_role: string;
  program_fee: number;
  currency: string;
  status: string;
}

interface AddProgramModalProps {
  visible: boolean;
  programs?: Array<{ id: number; program_code: string; program_name: string }>;
  existingPrograms?: Array<{ id: number; program_code: string; program_name: string }>;
  initialData?: ProgramData | null;
  onClose: () => void;
  onSubmit: (data: ProgramData) => void;
}

export const AddProgramModal: React.FC<AddProgramModalProps> = ({
  visible,
  programs = [],
  existingPrograms = [],
  initialData,
  onClose,
  onSubmit,
}) => {
  const allExisting = existingPrograms.length > 0 ? existingPrograms : programs;

  const generateUniqueProgramCode = () => {
    const year = new Date().getFullYear();
    const existingCodes = new Set(allExisting.map(p => p.program_code?.toUpperCase()));
    for (let i = 0; i < 30; i++) {
      const random4 = Math.floor(1000 + Math.random() * 9000);
      const candidate = `INT-AI-${year}-${random4}`;
      if (!existingCodes.has(candidate)) return candidate;
    }
    return `INT-AI-${year}-${Date.now().toString().slice(-4)}`;
  };

  const [formData, setFormData] = useState<ProgramData>(() => ({
    id: initialData?.id,
    program_code: initialData?.program_code || generateUniqueProgramCode(),
    program_name: initialData?.program_name || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    skills: initialData?.skills || '',
    learning_outcomes: initialData?.learning_outcomes || '',
    duration: initialData?.duration || '3 Months',
    mode: initialData?.mode || 'Remote',
    mentor_name: initialData?.mentor_name || '',
    mentor_role: initialData?.mentor_role || '',
    program_fee: initialData?.program_fee ?? 0,
    currency: initialData?.currency || 'INR',
    status: initialData?.status || 'active',
  }));

  // Re-sync form state on modal open or initialData change
  React.useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormData({
          id: initialData.id,
          program_code: initialData.program_code || '',
          program_name: initialData.program_name || '',
          category: initialData.category || '',
          description: initialData.description || '',
          skills: initialData.skills || '',
          learning_outcomes: initialData.learning_outcomes || '',
          duration: initialData.duration || '3 Months',
          mode: initialData.mode || 'Remote',
          mentor_name: initialData.mentor_name || '',
          mentor_role: initialData.mentor_role || '',
          program_fee: initialData.program_fee ?? 0,
          currency: initialData.currency || 'INR',
          status: initialData.status || 'active',
        });
      } else {
        setFormData({
          id: undefined,
          program_code: generateUniqueProgramCode(),
          program_name: '',
          category: '',
          description: '',
          skills: '',
          learning_outcomes: '',
          duration: '3 Months',
          mode: 'Remote',
          mentor_name: '',
          mentor_role: '',
          program_fee: 0,
          currency: 'INR',
          status: 'active',
        });
      }
    }
  }, [visible, initialData]);

  if (!visible || typeof document === 'undefined') return null;

  const isDuplicateCode = Boolean(
    formData.program_code.trim() &&
    allExisting.some(
      p =>
        p.program_code?.trim().toUpperCase() === formData.program_code.trim().toUpperCase() &&
        p.id !== initialData?.id
    )
  );

  const matchedProgram = isDuplicateCode
    ? allExisting.find(
        p =>
          p.program_code?.trim().toUpperCase() === formData.program_code.trim().toUpperCase() &&
          p.id !== initialData?.id
      )
    : null;

  const handleChange = (field: keyof ProgramData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.program_code.trim() || !formData.program_name.trim() || isDuplicateCode) return;
    onSubmit(formData);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100000,
      }}
    >
      <div
        style={{
          backgroundColor: cssVar('backgroundPrimaryColor'),
          border: `1px solid ${cssVar('borderColor')}`,
          color: cssVar('textPrimaryColor'),
          padding: '24px',
          borderRadius: '12px',
          width: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
              {initialData ? 'Edit Internship Program' : 'Create Internship Program'}
            </h3>
            <p style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), margin: '4px 0 0 0' }}>
              Define internship curriculum track, cohort parameters, and fee structure.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: cssVar('textSecondaryColor'),
            }}
          >
            <CloseIconSvg />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Program Code & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: isDuplicateCode ? '#ef4444' : cssVar('textSecondaryColor') }}>
                  Program Code *
                </label>
                <button
                  type="button"
                  onClick={() => handleChange('program_code', generateUniqueProgramCode())}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                  title="Generate a fresh unique Program Code"
                >
                  Regenerate Code
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. INT-AI-2026-01"
                value={formData.program_code}
                onChange={e => handleChange('program_code', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${isDuplicateCode ? '#ef4444' : cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              />
              {isDuplicateCode && (
                <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                  Already taken by "{matchedProgram?.program_name || 'another track'}". Click Regenerate Code.
                </span>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Program Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Autonomous AI Agents Research"
                value={formData.program_name}
                onChange={e => handleChange('program_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Track Category, Duration, Mode, and Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Category / Track
              </label>
              <input
                type="text"
                placeholder="e.g. Machine Learning, NLP"
                value={formData.category}
                onChange={e => handleChange('category', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Duration
              </label>
              <input
                type="text"
                placeholder="3 Months"
                value={formData.duration}
                onChange={e => handleChange('duration', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Mode
              </label>
              <select
                value={formData.mode}
                onChange={e => handleChange('mode', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Program Fee & Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Program Fee
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={formData.program_fee}
                onChange={e => handleChange('program_fee', parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Fee Currency
              </label>
              <select
                value={formData.currency}
                onChange={e => handleChange('currency', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
              Program Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of research areas and curriculum scope..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${cssVar('borderColor')}`,
                backgroundColor: cssVar('backgroundPrimaryColor'),
                color: cssVar('textPrimaryColor'),
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Skills & Technologies (Appears on Certificate)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. LLM Orchestration, Autonomous Agents, Graph RAG"
                value={formData.skills}
                onChange={e => handleChange('skills', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Learning Outcomes & Tasks (Appears on Certificate)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Model evaluation, deployment pipelines, benchmark analysis"
                value={formData.learning_outcomes}
                onChange={e => handleChange('learning_outcomes', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Lead Mentor Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Ansan Mathew"
                value={formData.mentor_name}
                onChange={e => handleChange('mentor_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Mentor Role / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Chief AI Scientist"
                value={formData.mentor_role}
                onChange={e => handleChange('mentor_role', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  backgroundColor: cssVar('backgroundPrimaryColor'),
                  color: cssVar('textPrimaryColor'),
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={isDuplicateCode}
            >
              {initialData ? 'Save Changes' : 'Create Program'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};