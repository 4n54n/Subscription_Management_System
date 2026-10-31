import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cssVar } from '@toeverything/theme';
import * as styles from '../../proposals/styles.css';
import { CloseIconSvg, BulkIconSvg } from './icons';
import { useCompanyProfile } from '@affine/core/components/hooks/use-company-profile';
import type { InternData } from './add-intern-modal';

interface BulkAddModalProps {
  visible: boolean;
  programs: Array<{ id: number; program_name: string; program_code: string }>;
  onClose: () => void;
  onSubmit: (programId: number, items: Partial<InternData>[]) => void;
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

export const BulkAddModal: React.FC<BulkAddModalProps> = ({
  visible,
  programs,
  onClose,
  onSubmit,
}) => {
  const companyProfile = useCompanyProfile();
  const authorizedPersonnels = companyProfile?.authorizedPersonnels || [];

  // Required Cohort Selectors
  const [selectedProgramId, setSelectedProgramId] = useState<number>(programs[0]?.id || 0);
  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string>(authorizedPersonnels[0]?.id || '');

  // 4 comprehensive example rows showcasing all Internship Types, Payment Statuses, Completion Statuses, and Record Statuses
  const sampleAllFields = `# Headers: Name, Email, Phone, Role, CertificateNo, StartDate, EndDate, IssueDate, Type, PaymentStatus, CompletionStatus, RecordStatus, Stipend, Fee, Scholarship
Alex Johnson, alex.johnson@example.com, +1 555-0199, AI Research Intern, INT-2026-101102, 01 OCTOBER 2026, 31 DECEMBER 2026, 23 SEPTEMBER 2026, Research, Paid, Completed, valid, 15000, 0, 5000
Maya Lin, maya.lin@example.com, +1 555-0142, Autonomous Agent Intern, INT-2026-102103, 01 OCTOBER 2026, 31 DECEMBER 2026, 23 SEPTEMBER 2026, Industrial, Waived, Distinction, valid, 20000, 0, 10000
David Miller, david.m@example.com, +1 555-0177, Neural Architectures Intern, INT-2026-103104, 01 OCTOBER 2026, 31 DECEMBER 2026, 23 SEPTEMBER 2026, Academic, Pending, Honors, expired, 0, 5000, 0
Elena Rostova, elena.r@example.com, +1 555-0188, Computer Vision Intern, INT-2026-104105, 01 OCTOBER 2026, 31 DECEMBER 2026, 23 SEPTEMBER 2026, Virtual, Paid, In Progress, revoked, 12000, 0, 0`;

  const [rawCsvText, setRawCsvText] = useState<string>(sampleAllFields);

  useEffect(() => {
    if (!selectedSignatoryId && authorizedPersonnels.length > 0) {
      setSelectedSignatoryId(authorizedPersonnels[0].id);
    }
  }, [authorizedPersonnels]);

  if (!visible || typeof document === 'undefined') return null;

  const selectedSignatory = (authorizedPersonnels as any[]).find((p: any) => p.id === selectedSignatoryId) || authorizedPersonnels[0];
  const defaultIssuedBy = selectedSignatory?.name || 'Ansan Mathew';
  const defaultIssuerRole = selectedSignatory?.role || 'Founder & Director';

  const defaultStartDate = formatDateToStandard(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  const defaultEndDate = formatDateToStandard(new Date());
  const defaultIssueDate = formatDateToStandard(new Date());

  // Smart Parse CSV lines with header detection or positional fallback
  const lines = rawCsvText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  let hasHeader = false;
  let headerMap: Record<string, number> = {};

  if (lines.length > 0) {
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('name') && (firstLineLower.includes('email') || firstLineLower.includes('role') || firstLineLower.includes('certificate'))) {
      hasHeader = true;
      const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
      headers.forEach((h, idx) => {
        headerMap[h] = idx;
      });
    }
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;

  const parsedRows: InternData[] = dataLines.map((line, idx) => {
    const parts = line.split(/[,;\t]/).map(p => p.trim());

    const getVal = (aliases: string[], positionalIdx: number, defaultVal: string = ''): string => {
      if (hasHeader) {
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9_]/g, '');
          if (headerMap[cleanAlias] !== undefined) {
            return parts[headerMap[cleanAlias]] ?? defaultVal;
          }
        }
      }
      return parts[positionalIdx] !== undefined && parts[positionalIdx] !== '' ? parts[positionalIdx] : defaultVal;
    };

    const name = getVal(['name', 'recipient_name', 'candidatename', 'full_name'], 0, '');
    const email = getVal(['email', 'holder_email', 'emailaddress'], 1, '');
    const phone = getVal(['phone', 'holder_phone', 'phonenumber', 'mobile'], 2, '');
    const role = getVal(['role', 'title', 'internrole', 'position'], 3, 'AI Research Intern');

    const year = new Date().getFullYear();
    let hash = 5381;
    const seed = `${line}_${idx}_${name}`;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) + hash) + seed.charCodeAt(i);
    }
    const random6 = String(100000 + (Math.abs(hash) % 900000));
    const autoCertNum = `INT-${year}-${random6}`;

    const certNum = getVal(['certno', 'certificateno', 'certificatenumber', 'certificate_number', 'cert_number'], 4, autoCertNum);
    const rowStartDate = getVal(['startdate', 'start_date', 'tenurestart'], 5, defaultStartDate);
    const rowEndDate = getVal(['enddate', 'end_date', 'tenureend'], 6, defaultEndDate);
    const rowIssueDate = getVal(['issuedate', 'issue_date', 'date'], 7, defaultIssueDate);
    const rowType = getVal(['type', 'internshiptype', 'internship_type', 'mode'], 8, 'Research');
    const rowPayment = getVal(['payment', 'paymentstatus', 'payment_status'], 9, 'Paid');
    const rowCompletion = getVal(['completion', 'completionstatus', 'completion_status'], 10, 'Completed');
    const rowStatus = getVal(['status', 'recordstatus', 'record_status', 'validity'], 11, 'valid').toLowerCase();
    const rowStipend = parseFloat(getVal(['stipend', 'stipendamount'], 12, '0')) || 0;
    const rowFee = parseFloat(getVal(['fee', 'participantfee', 'participant_fee'], 13, '0')) || 0;
    const rowScholarship = parseFloat(getVal(['scholarship', 'scholarshipamount'], 14, '0')) || 0;
    const rowSignatory = getVal(['signatory', 'issuedby', 'issued_by'], 15, defaultIssuedBy);
    const rowIssuerRole = getVal(['issuerrole', 'issuer_role', 'designation'], 16, defaultIssuerRole);

    return {
      recipient_name: name,
      holder_email: email,
      holder_phone: phone,
      role: role,
      certificate_number: certNum || autoCertNum,
      program_id: selectedProgramId,
      start_date: rowStartDate,
      end_date: rowEndDate,
      issue_date: rowIssueDate,
      issued_by: rowSignatory,
      issuer_role: rowIssuerRole,
      signatory_id: selectedSignatory?.id,
      status: rowStatus === 'revoked' || rowStatus === 'expired' ? rowStatus : 'valid',
      internship_type: rowType,
      completion_status: rowCompletion,
      payment_status: rowPayment,
      stipend: rowStipend,
      stipend_currency: 'INR',
      participant_fee: rowFee,
      participant_fee_currency: 'INR',
      scholarship: rowScholarship,
      scholarship_currency: 'INR',
    };
  }).filter(r => r.recipient_name.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedRows.length) return;
    onSubmit(selectedProgramId, parsedRows);
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
          width: '820px',
          maxWidth: '92vw',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: cssVar('textPrimaryColor'), display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BulkIconSvg />
              <span>Bulk Import Intern Candidates</span>
            </h3>
            <p style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), margin: '4px 0 0 0' }}>
              Import candidate roster via CSV / TSV with full column support for all options.
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
          {/* Target Track & Signatory Selection */}
          <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: cssVar('backgroundSecondaryColor'), border: `1px solid ${cssVar('borderColor')}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                  Target Track / Program *
                </label>
                <select
                  required
                  value={selectedProgramId}
                  onChange={e => setSelectedProgramId(parseInt(e.target.value, 10))}
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
                <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), display: 'block', marginBottom: '4px' }}>
                  Authorized Signatory
                </label>
                <select
                  value={selectedSignatoryId}
                  onChange={e => setSelectedSignatoryId(e.target.value)}
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
                      {p.name} ({p.role}) {p.signatureData ? '✓ Signature attached' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CSV Input Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>
                CSV Roster Data (Supports all fields or standard format)
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setRawCsvText(sampleAllFields)}
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
                >
                  Load Complete 4-Option Sample
                </button>
                <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), fontWeight: 600 }}>
                  ({parsedRows.length} candidates ready)
                </span>
              </div>
            </div>
            <textarea
              rows={6}
              value={rawCsvText}
              onChange={e => setRawCsvText(e.target.value)}
              placeholder="Name, Email, Phone, Role, CertificateNo, StartDate, EndDate, IssueDate, Type, PaymentStatus, CompletionStatus, RecordStatus, Stipend, Fee, Scholarship"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: `1px solid ${cssVar('borderColor')}`,
                backgroundColor: cssVar('backgroundPrimaryColor'),
                color: cssVar('textPrimaryColor'),
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* Parsed Live Roster Preview Table with All Supported Fields */}
          {parsedRows.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textSecondaryColor'), marginBottom: '6px' }}>
                Parsed Candidate Roster Preview ({parsedRows.length} entries)
              </div>
              <div
                style={{
                  maxHeight: '180px',
                  overflowX: 'auto',
                  overflowY: 'auto',
                  border: `1px solid ${cssVar('borderColor')}`,
                  borderRadius: '8px',
                }}
              >
                <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: cssVar('backgroundSecondaryColor'), borderBottom: `1px solid ${cssVar('borderColor')}` }}>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '30px' }}>#</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '120px' }}>Name</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '130px' }}>Email</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '90px' }}>Phone</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '120px' }}>Role</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '110px' }}>Certificate #</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '130px' }}>Tenure</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '75px' }}>Type</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '70px' }}>Payment</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '75px' }}>Completion</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '65px' }}>Status</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: '65px' }}>Stipend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${cssVar('borderColor')}` }}>
                        <td style={{ padding: '6px 8px', color: cssVar('textSecondaryColor') }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>{r.recipient_name}</td>
                        <td style={{ padding: '6px 8px', color: cssVar('textSecondaryColor') }}>{r.holder_email || '-'}</td>
                        <td style={{ padding: '6px 8px', color: cssVar('textSecondaryColor') }}>{r.holder_phone || '-'}</td>
                        <td style={{ padding: '6px 8px' }}>{r.role}</td>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{r.certificate_number}</td>
                        <td style={{ padding: '6px 8px', fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                          {r.start_date} → {r.end_date}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 500 }}>
                            {r.internship_type}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: r.payment_status === 'Paid' ? '#d1fae5' : r.payment_status === 'Waived' ? '#dbeafe' : '#fef3c7', color: r.payment_status === 'Paid' ? '#065f46' : r.payment_status === 'Waived' ? '#1e40af' : '#92400e', fontWeight: 500 }}>
                            {r.payment_status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#047857', fontWeight: 500 }}>
                            {r.completion_status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: r.status === 'valid' ? '#dcfce7' : r.status === 'expired' ? '#f3f4f6' : '#fee2e2', color: r.status === 'valid' ? '#166534' : r.status === 'expired' ? '#4b5563' : '#991b1b', fontWeight: 500 }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 500 }}>
                          {r.stipend ? `₹${r.stipend}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Footer */}
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
              disabled={!parsedRows.length}
            >
              Enroll {parsedRows.length} Candidates
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
