import { CURRENCY_OPTIONS } from './currencies';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cssVar } from '@toeverything/theme';
import * as styles from '../../proposals/styles.css';
import { CloseIconSvg } from './icons';
import { useCompanyProfile } from '@affine/core/components/hooks/use-company-profile';
import { toCalendarValue, formatDisplayDate } from './date-utils';

export interface InternData {
  id?: number;
  certificate_number: string;
  program_id: number;
  recipient_name: string;
  role: string;
  holder_email: string;
  holder_phone: string;
  start_date: string;
  end_date: string;
  issue_date: string;
  issued_by: string;
  issuer_role: string;
  signatory_id?: string;
  status: string;
  internship_type: string;
  scholarship: number;
  scholarship_currency: string;
  participant_fee: number;
  participant_fee_currency: string;
  stipend: number;
  stipend_currency: string;
  payment_status: string;
  completion_status: string;
}

interface AddInternModalProps {
  visible: boolean;
  programs: Array<{ id: number; program_name: string; program_code: string }>;
  initialData?: InternData | null;
  onClose: () => void;
  onSubmit: (data: InternData) => void;
}

function formatDateToStandard(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export const AddInternModal: React.FC<AddInternModalProps> = ({
  visible,
  programs,
  initialData,
  onClose,
  onSubmit,
}) => {
  const companyProfile = useCompanyProfile();
  const authorizedPersonnels = companyProfile?.authorizedPersonnels || [];

  const generateRandomCertId = () => {
    const year = new Date().getFullYear();
    const random6 = Math.floor(100000 + Math.random() * 900000);
    return `INT-${year}-${random6}`;
  };

  const defaultCertNum = generateRandomCertId();

  const [formData, setFormData] = useState<InternData>(() => ({
    certificate_number: initialData?.certificate_number || defaultCertNum,
    program_id: initialData?.program_id || programs[0]?.id || 0,
    recipient_name: initialData?.recipient_name || '',
    role: initialData?.role || 'AI Research Intern',
    holder_email: initialData?.holder_email || '',
    holder_phone: initialData?.holder_phone || '',
    start_date: initialData?.start_date || formatDateToStandard(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    end_date: initialData?.end_date || formatDateToStandard(new Date()),
    issue_date: initialData?.issue_date || formatDateToStandard(new Date()),
    issued_by: initialData?.issued_by || authorizedPersonnels[0]?.name || 'Ansan Mathew',
    issuer_role: initialData?.issuer_role || authorizedPersonnels[0]?.role || 'Founder & Director',
    signatory_id: initialData?.signatory_id || authorizedPersonnels[0]?.id || '',
    status: initialData?.status || 'valid',
    internship_type: initialData?.internship_type || 'Research',
    scholarship: initialData?.scholarship ?? 0,
    scholarship_currency: initialData?.scholarship_currency || 'INR',
    participant_fee: initialData?.participant_fee ?? 0,
    participant_fee_currency: initialData?.participant_fee_currency || 'INR',
    stipend: initialData?.stipend ?? 0,
    stipend_currency: initialData?.stipend_currency || 'INR',
    payment_status: initialData?.payment_status || 'Paid',
    completion_status: initialData?.completion_status || 'Completed',
  }));

  // Re-sync intern form state on modal open or initialData change
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormData({
          id: initialData.id,
          certificate_number: initialData.certificate_number || '',
          program_id: initialData.program_id || programs[0]?.id || 0,
          recipient_name: initialData.recipient_name || '',
          role: initialData.role || 'AI Research Intern',
          holder_email: initialData.holder_email || '',
          holder_phone: initialData.holder_phone || '',
          start_date: initialData.start_date || formatDateToStandard(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
          end_date: initialData.end_date || formatDateToStandard(new Date()),
          issue_date: initialData.issue_date || formatDateToStandard(new Date()),
          issued_by: initialData.issued_by || authorizedPersonnels[0]?.name || 'Ansan Mathew',
          issuer_role: initialData.issuer_role || authorizedPersonnels[0]?.role || 'Founder & Director',
          signatory_id: initialData.signatory_id || authorizedPersonnels[0]?.id || '',
          status: initialData.status || 'valid',
          internship_type: initialData.internship_type || 'Research',
          scholarship: initialData.scholarship ?? 0,
          scholarship_currency: initialData.scholarship_currency || 'INR',
          participant_fee: initialData.participant_fee ?? 0,
          participant_fee_currency: initialData.participant_fee_currency || 'INR',
          stipend: initialData.stipend ?? 0,
          stipend_currency: initialData.stipend_currency || 'INR',
          payment_status: initialData.payment_status || 'Paid',
          completion_status: initialData.completion_status || 'Completed',
        });
      } else {
        const firstAuth = authorizedPersonnels[0];
        setFormData({
          id: undefined,
          certificate_number: generateRandomCertId(),
          program_id: programs[0]?.id || 0,
          recipient_name: '',
          role: 'AI Research Intern',
          holder_email: '',
          holder_phone: '',
          start_date: formatDateToStandard(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
          end_date: formatDateToStandard(new Date()),
          issue_date: formatDateToStandard(new Date()),
          issued_by: firstAuth?.name || 'Ansan Mathew',
          issuer_role: firstAuth?.role || 'Founder & Director',
          signatory_id: firstAuth?.id || '',
          status: 'valid',
          internship_type: 'Research',
          scholarship: 0,
          scholarship_currency: 'INR',
          participant_fee: 0,
          participant_fee_currency: 'INR',
          stipend: 0,
          stipend_currency: 'INR',
          payment_status: 'Paid',
          completion_status: 'Completed',
        });
      }
    }
  }, [visible, initialData, authorizedPersonnels]);

  if (!visible || typeof document === 'undefined') return null;

  const handleChange = (field: keyof InternData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignatoryChange = (id: string) => {
    const selected = (authorizedPersonnels as any[]).find((p: any) => p.id === id);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        signatory_id: selected.id,
        issued_by: selected.name,
        issuer_role: selected.role,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipient_name.trim() || !formData.certificate_number.trim()) return;
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
          width: '680px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor') }}>
              {initialData ? 'Edit Intern Certificate Record' : 'Enroll Intern & Issue Certificate'}
            </h3>
            <p style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), margin: '4px 0 0 0' }}>
              Register intern candidate and link to an internship curriculum track.
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
          {/* Program and Certificate Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Assigned Program *
              </label>
              <select
                required
                value={formData.program_id}
                onChange={e => handleChange('program_id', parseInt(e.target.value, 10))}
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
                {programs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.program_name} ({p.program_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>
                  Certificate Number *
                </label>
                <button
                  type="button"
                  onClick={() => handleChange('certificate_number', generateRandomCertId())}
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
                  title="Generate a fresh unique 6-digit certificate ID"
                >
                  Regenerate ID
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="INT-2026-370888"
                value={formData.certificate_number}
                onChange={e => handleChange('certificate_number', e.target.value)}
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
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* Candidate Name & Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Candidate Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Johnson"
                value={formData.recipient_name}
                onChange={e => handleChange('recipient_name', e.target.value)}
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
                Role / Title (Appears on Certificate) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AI Research Intern"
                value={formData.role}
                onChange={e => handleChange('role', e.target.value)}
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

          {/* Email and Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="intern@university.edu"
                value={formData.holder_email}
                onChange={e => handleChange('holder_email', e.target.value)}
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
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 555-0199"
                value={formData.holder_phone}
                onChange={e => handleChange('holder_phone', e.target.value)}
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

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={toCalendarValue(formData.start_date)}
                onChange={e => handleChange('start_date', formatDisplayDate(e.target.value))}
                onClick={e => e.currentTarget.showPicker?.()}
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
                  cursor: 'pointer',
                }}
              />
              {formData.start_date && (
                <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), marginTop: '2px', display: 'block' }}>
                  {formData.start_date}
                </span>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                End Date
              </label>
              <input
                type="date"
                value={toCalendarValue(formData.end_date)}
                onChange={e => handleChange('end_date', formatDisplayDate(e.target.value))}
                onClick={e => e.currentTarget.showPicker?.()}
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
                  cursor: 'pointer',
                }}
              />
              {formData.end_date && (
                <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), marginTop: '2px', display: 'block' }}>
                  {formData.end_date}
                </span>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Issue Date
              </label>
              <input
                type="date"
                value={toCalendarValue(formData.issue_date)}
                onChange={e => handleChange('issue_date', formatDisplayDate(e.target.value))}
                onClick={e => e.currentTarget.showPicker?.()}
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
                  cursor: 'pointer',
                }}
              />
              {formData.issue_date && (
                <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), marginTop: '2px', display: 'block' }}>
                  {formData.issue_date}
                </span>
              )}
            </div>
          </div>

          {/* Signatory, Type, Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Authorized Signatory
              </label>
              <select
                value={formData.signatory_id}
                onChange={e => handleSignatoryChange(e.target.value)}
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
                {(authorizedPersonnels as any[]).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role}) {p.signatureData ? '? Signature attached' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Internship Type
              </label>
              <select
                value={formData.internship_type}
                onChange={e => handleChange('internship_type', e.target.value)}
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
                <option value="Research">Research</option>
                <option value="Industrial">Industrial</option>
                <option value="Academic">Academic</option>
                <option value="Virtual">Virtual</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Record Status
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
                <option value="valid">Valid</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Payment & Completion Statuses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Payment Status
              </label>
              <select
                value={formData.payment_status}
                onChange={e => handleChange('payment_status', e.target.value)}
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
                <option value="Paid">Paid</option>
                <option value="Waived">Waived / Free</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                Completion Status
              </label>
              <select
                value={formData.completion_status}
                onChange={e => handleChange('completion_status', e.target.value)}
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
                <option value="Completed">Completed</option>
                <option value="Honors">Completed with Honors</option>
                <option value="Distinction">Distinction</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>

          {/* Financials: Stipend, Fee, Scholarship */}
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: cssVar('backgroundSecondaryColor'), border: `1px solid ${cssVar('borderColor')}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2563eb' }}>
              Compensation & Financials
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {/* Stipend */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '2px' }}>
                  Stipend Amount
                </label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <select
                    value={formData.stipend_currency}
                    onChange={e => handleChange('stipend_currency', e.target.value)}
                    style={{
                      width: '74px',
                      flexShrink: 0,
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '11.5px',
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
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.stipend || ''}
                    onChange={e => handleChange('stipend', parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1,
                      width: '100%',
                      minWidth: 0,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Participant Fee */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '2px' }}>
                  Participant Fee
                </label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <select
                    value={formData.participant_fee_currency}
                    onChange={e => handleChange('participant_fee_currency', e.target.value)}
                    style={{
                      width: '74px',
                      flexShrink: 0,
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '11.5px',
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
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.participant_fee || ''}
                    onChange={e => handleChange('participant_fee', parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1,
                      width: '100%',
                      minWidth: 0,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Scholarship */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '2px' }}>
                  Scholarship / Grant
                </label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <select
                    value={formData.scholarship_currency}
                    onChange={e => handleChange('scholarship_currency', e.target.value)}
                    style={{
                      width: '74px',
                      flexShrink: 0,
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '11.5px',
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
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.scholarship || ''}
                    onChange={e => handleChange('scholarship', parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1,
                      width: '100%',
                      minWidth: 0,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      backgroundColor: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
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
            >
              {initialData ? 'Save Changes' : 'Enroll Intern'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};