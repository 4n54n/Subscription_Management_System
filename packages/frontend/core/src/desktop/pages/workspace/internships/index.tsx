import React, { useState, useEffect, useMemo } from 'react';
import { useService } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { cssVar } from '@toeverything/theme';
import { toast } from '@affine/component';
import * as styles from '../proposals/styles.css';
import {
  PlusIconSvg,
  BulkIconSvg,
  DownloadIconSvg,
  EditIconSvg,
  CertificateIconSvg,
  TrashIconSvg,
} from './components/icons';
import { AddProgramModal, type ProgramData } from './components/add-program-modal';
import { AddInternModal, type InternData } from './components/add-intern-modal';
import { BulkAddModal } from './components/bulk-add-modal';
import { OtpModal } from './components/otp-modal';
import { CertificateEditor } from './components/certificate-editor';
import { generateQrSvg } from './components/qr_code';
import { useCompanyProfile, resolveCompanyLogo } from '@affine/core/components/hooks/use-company-profile';

const saveBlob = async (blob: Blob, filename: string): Promise<void> => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

const fetchPdfWithProgress = async (
  url: string,
  body: any,
  onProgress?: (percent: number) => void
): Promise<Blob> => {
  let currentProgress = 0;
  let progressInterval: any = null;
  if (onProgress) {
    progressInterval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.floor(Math.random() * 5) + 2;
        if (currentProgress > 90) currentProgress = 90;
        onProgress(currentProgress);
      }
    }, 150);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (progressInterval) clearInterval(progressInterval);
      const errText = await res.text();
      throw new Error(errText || 'Failed to generate PDF');
    }

    if (progressInterval) clearInterval(progressInterval);

    const reader = res.body?.getReader();
    if (!reader) {
      if (onProgress) onProgress(100);
      return await res.blob();
    }

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
      }
    }

    if (onProgress) onProgress(100);
    return new Blob(chunks, { type: 'application/pdf' });
  } catch (e) {
    if (progressInterval) clearInterval(progressInterval);
    throw e;
  }
};

export const Component: React.FC = () => {
  const currentWorkspace = useService(WorkspaceService).workspace;
  const workspaceId = currentWorkspace.id;
  const companyProfile = useCompanyProfile();

  // Active view: 'programs' | 'interns' | 'editor'
  const [activeTab, setActiveTab] = useState<'programs' | 'interns'>('programs');
  const [editingProgramForCert, setEditingProgramForCert] = useState<any | null>(null);

  // Data states
  const [programs, setPrograms] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('all');

  // Modal states
  const [addProgramModalOpen, setAddProgramModalOpen] = useState<boolean>(false);
  const [editingProgram, setEditingProgram] = useState<ProgramData | null>(null);

  const [addInternModalOpen, setAddInternModalOpen] = useState<boolean>(false);
  const [editingIntern, setEditingIntern] = useState<InternData | null>(null);

  const [bulkAddModalOpen, setBulkAddModalOpen] = useState<boolean>(false);

  // OTP Modal state
  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    purpose: string;
    actionTitle: string;
    pendingAction?: (code: string) => Promise<void>;
  }>({
    visible: false,
    purpose: 'SaveInternshipDocument',
    actionTitle: '',
  });
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [otpSending, setOtpSending] = useState<boolean>(false);

  // Fetch programs and certificates
  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsRes, certsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/internships/programs`),
        fetch(`/api/workspaces/${workspaceId}/internships/certificates`),
      ]);

      if (programsRes.ok) {
        const pData = await programsRes.json();
        setPrograms(pData || []);
      }
      if (certsRes.ok) {
        const cData = await certsRes.json();
        setCertificates(cData || []);
      }
    } catch (err: any) {
      console.error('Error fetching internships data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  // Trigger OTP dispatch before restricted actions
  const triggerOtp = async (
    purpose: string,
    actionTitle: string,
    actionCallback: (code: string) => Promise<void>
  ) => {
    setOtpModal({
      visible: true,
      purpose,
      actionTitle,
      pendingAction: actionCallback,
    });
    setOtpSending(true);
    setOtpError('');
    setOtpCode('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/internships/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setOtpError(err.message || 'Failed to dispatch security code.');
      }
    } catch (e: any) {
      setOtpError(e.message || 'Network error sending OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpConfirm = async (code: string) => {
    if (!otpModal.pendingAction) return;
    try {
      await otpModal.pendingAction(code);
      setOtpModal({ visible: false, purpose: '', actionTitle: '' });
      setOtpCode('');
      setOtpError('');
    } catch (e: any) {
      setOtpError(e.message || 'Authorization failed.');
    }
  };

  // --- Program Handlers ---
  const handleSaveProgram = (programData: ProgramData) => {
    const isEdit = Boolean(programData.id);
    const title = isEdit ? `Update Program: ${programData.program_name}` : `Create Program: ${programData.program_name}`;

    triggerOtp('SaveInternshipProgram', title, async (code: string) => {
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/internships/programs/${programData.id}`
        : `/api/workspaces/${workspaceId}/internships/programs`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program: programData, otpCode: code }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save internship program');
      }

      toast(isEdit ? 'Internship program updated successfully' : 'Internship program created successfully');
      setAddProgramModalOpen(false);
      setEditingProgram(null);
      fetchData();
    });
  };

  // --- Intern Handlers ---
  const handleSaveIntern = (internData: InternData) => {
    const isEdit = Boolean(internData.id);
    const title = isEdit
      ? `Update Intern: ${internData.recipient_name} (${internData.certificate_number})`
      : `Enroll Intern: ${internData.recipient_name}`;

    triggerOtp('SaveInternshipCertificate', title, async (code: string) => {
      const url = isEdit
        ? `/api/workspaces/${workspaceId}/internships/certificates/${internData.id}`
        : `/api/workspaces/${workspaceId}/internships/certificates`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate: internData, otpCode: code }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save intern certificate record');
      }

      toast(isEdit ? 'Intern record updated successfully' : 'Intern enrolled and certificate registered');
      setAddInternModalOpen(false);
      setEditingIntern(null);
      fetchData();
    });
  };

  // --- Bulk Add Handler ---
  const handleBulkAdd = (programId: number, items: Partial<InternData>[]) => {
    triggerOtp(
      'BulkAddInternshipCertificates',
      `Bulk Enroll ${items.length} Intern Candidates`,
      async (code: string) => {
        const res = await fetch(`/api/workspaces/${workspaceId}/internships/certificates/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId, items, certificates: items, otpCode: code }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to bulk-enroll interns');
        }

        const data = await res.json();
        toast(`Successfully enrolled ${data.inserted || items.length} interns into program.`);
        setBulkAddModalOpen(false);
        fetchData();
      }
    );
  };

  // --- Delete Intern Handler (Protected by OTP) ---
  const handleDeleteIntern = (cert: any) => {
    const title = `Delete Enrolled Intern: ${cert.recipient_name} (${cert.certificate_number})`;
    triggerOtp('DeleteInternshipCertificate', title, async (code: string) => {
      let res = await fetch(`/api/workspaces/${workspaceId}/internships/certificates/${cert.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: code }),
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/workspaces/${workspaceId}/internships/certificates/${cert.id}/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpCode: code }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete intern record');
      }

      toast(`Enrolled intern record for ${cert.recipient_name} deleted successfully.`);
      fetchData();
    });
  };

  // --- Download Single PDF for Intern ---
  const handleDownloadPdfForIntern = async (cert: any) => {
    try {
      toast('Generating official certificate PDF...');
      const prog = programs.find(p => p.id === cert.program_id) || {};
      const [templateRes, styleRes] = await Promise.all([
        fetch(`/certificate_template.html?t=${Date.now()}`),
        fetch(`/certificate_style.css?t=${Date.now()}`),
      ]);
      let html = await templateRes.text();
      const css = await styleRes.text();

      // Inline stylesheet directly
      if (html.includes('<link rel="stylesheet" href="certificate_style.css">')) {
        html = html.replace('<link rel="stylesheet" href="certificate_style.css">', `<style>\n${css}\n</style>`);
      } else if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
      }

      // Find authorized personnel signature if attached
      let signatureHtml = '';
      if (companyProfile?.authorizedPersonnels) {
        const auth = companyProfile.authorizedPersonnels.find((p: any) => p.id === cert.signatory_id || p.name === cert.issued_by);
        if (auth?.signatureData) {
          signatureHtml = `<div class="signature-svg-wrap" style="height: 80px; display: flex; align-items: flex-end; justify-content: flex-start; margin-bottom: -4px;"><img src="${auth.signatureData}" alt="Signature" style="max-height: 80px; max-width: 260px; object-fit: contain;" /></div>`;
        }
      }

      if (signatureHtml) {
        html = html.replace(/<div class="signature-svg-wrap">[\s\S]*?<\/div>/, signatureHtml);
      }

      const compName = companyProfile?.companyName || 'IntoAI Technologies Pvt Ltd';
      const compTagline = companyProfile?.companyTagline || 'Enterprise AI Research & Solutions';
      let compLogo = resolveCompanyLogo(
        companyProfile?.companyLogoUrl,
        companyProfile?.companyLogoData,
        companyProfile?.logoSrc || '/CompanyLogo.png',
        companyProfile?.oneLogoData
      );
      if (compLogo && !compLogo.startsWith('data:') && !compLogo.startsWith('http') && !compLogo.startsWith('/')) {
        compLogo = '/' + compLogo;
      }

      const replacements: Record<string, string> = {
        '{{certificate.main_title}}': 'INTERNSHIP CERTIFICATE',
        '{{certificate.presented_label}}': 'PRESENTED TO',
        '{{recipient.name}}': cert.recipient_name || '',
        '{{recipient.role}}': cert.role || 'AI Research Intern',
        '{{recipient.start_date}}': cert.start_date || '',
        '{{recipient.end_date}}': cert.end_date || '',
        '{{metadata.issue_date}}': cert.issue_date || '',
        '{{metadata.certificate_no}}': cert.certificate_number || '',
        '{{details.statement_p1}}': `This is to certify that ${cert.recipient_name} has successfully completed an internship at ${compName} as ${cert.role} from ${cert.start_date} to ${cert.end_date}.`,
        '{{details.research_area}}': prog.skills || 'Autonomous AI Systems and Graph Neural Architectures',
        '{{details.project_description}}': prog.learning_outcomes || 'dataset curation, model fine-tuning, and evaluation',
        '{{details.statement_p3}}': 'We acknowledge their contribution and successful completion of the internship.',
        '{{signatory.name}}': cert.issued_by || 'Ansan Mathew',
        '{{signatory.designation}}': cert.issuer_role || 'Founder & Director',
        '{{signatory.organization}}': compName,
        '{{company.name}}': compName,
        '{{company.tagline}}': compTagline,
        '{{company.envision}}': 'E N V I S I O N',
        '{{company.logo}}': compLogo,
      };

      for (const [k, v] of Object.entries(replacements)) {
        html = html.replaceAll(k, v);
      }


      // Generate dynamic official verification QR code for this specific intern
      const certNum = (cert.certificate_number || '').trim();
      const verifyUrl = `https://verify.intoai.ai/internship/${certNum}`;
      const qrSvg = generateQrSvg(verifyUrl, 68);
      if (qrSvg) {
        html = html.replace(/<div class="header-qr-code" id="headerQrCode">[\s\S]*?<\/div>/, `<div class="header-qr-code" id="headerQrCode">${qrSvg}</div>`);
      }

      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>\n  <base href="/">');
      } else {
        html = '<base href="/">' + html;
      }

      const pdfBlob = await fetchPdfWithProgress(
        `/api/workspaces/${workspaceId}/internships/pdf`,
        { html, certificateId: cert.id, certificateNumber: certNum }
      );
      const filename = `Certificate_${cert.certificate_number.replace(/\//g, '_')}_${cert.recipient_name.replace(/\s+/g, '_')}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Certificate downloaded successfully');
    } catch (e: any) {
      console.error(e);
      toast(e.message || 'Error generating certificate PDF');
    }
  };

  // Filtered programs
  const filteredPrograms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return programs;
    return programs.filter(
      p =>
        p.program_name?.toLowerCase().includes(q) ||
        p.program_code?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.mentor_name?.toLowerCase().includes(q)
    );
  }, [programs, searchQuery]);

  // Filtered certificates
  const filteredCertificates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return certificates.filter(c => {
      const matchProgram = selectedProgramFilter === 'all' || String(c.program_id) === String(selectedProgramFilter);
      if (!matchProgram) return false;
      if (!q) return true;
      return (
        c.recipient_name?.toLowerCase().includes(q) ||
        c.certificate_number?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.holder_email?.toLowerCase().includes(q) ||
        c.program_name?.toLowerCase().includes(q)
      );
    });
  }, [certificates, searchQuery, selectedProgramFilter]);

  return (
    <div className={styles.container}>
      {editingProgramForCert ? (
        <CertificateEditor
          workspaceId={workspaceId}
          program={editingProgramForCert}
          otpModalVisible={otpModal.visible}
          onBack={() => setEditingProgramForCert(null)}
          onSave={(templateData) => {
            triggerOtp(
              'SaveCertificateTemplate',
              `Update Certificate Template for ${editingProgramForCert.program_name}`,
              async (code) => {
                const res = await fetch(`/api/workspaces/${workspaceId}/internships/programs/${editingProgramForCert.id}/template`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ templateData, otpCode: code }),
                });
                if (!res.ok) {
                  const errJson = await res.json().catch(() => ({}));
                  throw new Error(errJson.message || 'Failed to save certificate template');
                }
                toast('Certificate template saved successfully');
                setEditingProgramForCert(null);
                fetchData();
              }
            );
          }}
          onRequestPdf={async (html) => {
            try {
              toast('Compiling preview PDF...');
              if (html.includes('<head>')) {
                html = html.replace('<head>', '<head>\n  <base href="/">');
              } else {
                html = '<base href="/">' + html;
              }
              const pdfBlob = await fetchPdfWithProgress(
                `/api/workspaces/${workspaceId}/internships/pdf`,
                { html }
              );
              const filename = `preview_certificate_${editingProgramForCert.program_code}.pdf`;
              await saveBlob(pdfBlob, filename);
              toast('Certificate preview PDF downloaded successfully');
            } catch (e: any) {
              toast(e.message || 'Failed to generate PDF');
            }
          }}
        />
      ) : (
        <div className={styles.dashboardContainer}>
          {/* Dashboard Header Bar matching Proposals / Quotes / Letterheads */}
          <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Internships & Credentials</h1>
          <p className={styles.dashboardSubtitle}>
            Manage internship tracks, cohorts, and official certificates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box matching document pages */}
          <div style={{ position: 'relative', width: '240px' }}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={activeTab === 'programs' ? 'Search programs...' : 'Search interns...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Action Buttons using IntoAI styles */}
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => setBulkAddModalOpen(true)}
            disabled={programs.length === 0}
            title={programs.length === 0 ? 'Create a program first' : 'Bulk Import Interns via CSV'}
          >
            <BulkIconSvg />
            <span>Bulk Import</span>
          </button>

          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => {
              setEditingProgram(null);
              setAddProgramModalOpen(true);
            }}
          >
            <PlusIconSvg />
            <span>New Program</span>
          </button>

          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => {
              setEditingIntern(null);
              setAddInternModalOpen(true);
            }}
            disabled={programs.length === 0}
          >
            <PlusIconSvg />
            <span>Enroll Intern</span>
          </button>
        </div>
      </div>

      {/* Modern Tab Bar matching Invoices */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: `1px solid ${cssVar('borderColor')}`, paddingBottom: '0px', marginBottom: '-8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            style={{
              padding: '12px 8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'programs' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'programs' ? '#2563eb' : cssVar('textSecondaryColor'),
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => setActiveTab('programs')}
          >
            Programs ({programs.length})
          </button>
          <button
            style={{
              padding: '12px 8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'interns' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'interns' ? '#2563eb' : cssVar('textSecondaryColor'),
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => setActiveTab('interns')}
          >
            Enrolled Interns ({certificates.length})
          </button>
        </div>

        {activeTab === 'interns' && programs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: cssVar('textSecondaryColor'), fontWeight: 500 }}>Filter by track:</span>
            <select
              value={selectedProgramFilter}
              onChange={e => setSelectedProgramFilter(e.target.value)}
              className={styles.headerSelect}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              <option value="all">All Programs</option>
              {programs.map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.program_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: cssVar('textSecondaryColor'), fontSize: '13px' }}>
          Loading records...
        </div>
      ) : activeTab === 'programs' ? (
        /* Programs Table Card */
        <div className={styles.dashboardCard} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className={styles.table} style={{ minWidth: '920px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '135px', whiteSpace: 'nowrap' }}>Program Code</th>
                <th style={{ minWidth: '220px' }}>Program & Track</th>
                <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Duration & Mode</th>
                <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Lead Mentor</th>
                <th style={{ width: '100px', whiteSpace: 'nowrap' }}>Fee</th>
                <th style={{ width: '85px', whiteSpace: 'nowrap' }}>Status</th>
                <th
                  style={{
                    width: '160px',
                    textAlign: 'right',
                    paddingRight: '20px',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: cssVar('backgroundSecondaryColor'),
                    zIndex: 2,
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map(prog => (
                  <tr key={prog.id} className={styles.tableRow}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={styles.tableVersionBadge} title={prog.program_code}>
                        {prog.program_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: cssVar('textPrimaryColor'), display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} title={prog.program_name}>
                        <span>{prog.program_name}</span>
                        {prog.category && (
                          <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 500 }}>
                            {prog.category}
                          </span>
                        )}
                      </div>
                      {prog.description && (
                        <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={prog.description}>
                          {prog.description}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: cssVar('textPrimaryColor') }}>
                        {prog.duration}
                      </span>
                      <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor'), display: 'block' }}>
                        {prog.mode}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{prog.mentor_name || '—'}</div>
                      {prog.mentor_role && (
                        <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor') }}>{prog.mentor_role}</div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>
                        {prog.currency} {prog.program_fee ? Number(prog.program_fee).toLocaleString() : '0'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10.5px',
                          padding: '2px 8px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          backgroundColor: prog.status === 'active' ? '#d1fae5' : '#e2e8f0',
                          color: prog.status === 'active' ? '#065f46' : '#475569',
                        }}
                      >
                        {prog.status}
                      </span>
                    </td>
                    <td
                      onClick={e => e.stopPropagation()}
                      style={{
                        textAlign: 'right',
                        paddingRight: '20px',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        right: 0,
                        backgroundColor: cssVar('backgroundPrimaryColor'),
                        zIndex: 1,
                        boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className={styles.tableActionBtn}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            padding: '4px',
                            boxSizing: 'border-box',
                          }}
                          onClick={() => {
                            setEditingProgram(prog);
                            setAddProgramModalOpen(true);
                          }}
                          title="Edit Program Details"
                        >
                          <EditIconSvg />
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 500,
                            padding: '4px 10px',
                            height: '30px',
                            minHeight: '30px',
                            gap: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            boxSizing: 'border-box',
                          }}
                          onClick={() => setEditingProgramForCert(prog)}
                          title="Edit Certificate Template"
                        >
                          <CertificateIconSvg />
                          <span>Certificate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: cssVar('textSecondaryColor'), fontStyle: 'italic' }}>
                    No internship programs found. Click "New Program" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Interns Table Card */
        <div className={styles.dashboardCard} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className={styles.table} style={{ minWidth: '960px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Certificate #</th>
                <th style={{ minWidth: '180px' }}>Candidate Name</th>
                <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Role & Track</th>
                <th style={{ width: '160px', whiteSpace: 'nowrap' }}>Tenure</th>
                <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Signatory</th>
                <th style={{ width: '85px', whiteSpace: 'nowrap' }}>Status</th>
                <th
                  style={{
                    width: '130px',
                    textAlign: 'right',
                    paddingRight: '20px',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: cssVar('backgroundSecondaryColor'),
                    zIndex: 2,
                    boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCertificates.length > 0 ? (
                filteredCertificates.map(cert => (
                  <tr key={cert.id} className={styles.tableRow}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <a
                        href={`https://verify.intoai.ai/internship/${cert.certificate_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: '#2563eb',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                        title={`Verify certificate ${cert.certificate_number} on verify.intoai.ai`}
                      >
                        {cert.certificate_number}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: cssVar('textPrimaryColor') }}>
                        {cert.recipient_name}
                      </div>
                      {cert.holder_email && (
                        <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                          {cert.holder_email}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: cssVar('textPrimaryColor') }}>{cert.role || 'Intern'}</div>
                      <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                        {cert.program_name || 'General Track'}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '11.5px', color: cssVar('textPrimaryColor') }}>
                        {cert.start_date || '-'} → {cert.end_date || '-'}
                      </span>
                      {cert.internship_type && (
                        <span style={{ display: 'block', fontSize: '10.5px', color: '#2563eb', fontWeight: 500 }}>
                          {cert.internship_type} Track
                        </span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{cert.issued_by}</div>
                      <div style={{ fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                        {cert.issuer_role}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          backgroundColor: cert.status === 'valid' ? '#d1fae5' : cert.status === 'expired' ? '#f3f4f6' : '#fee2e2',
                          color: cert.status === 'valid' ? '#065f46' : cert.status === 'expired' ? '#4b5563' : '#991b1b',
                        }}
                      >
                        {cert.status}
                      </span>
                    </td>
                    <td
                      onClick={e => e.stopPropagation()}
                      style={{
                        textAlign: 'right',
                        paddingRight: '20px',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        right: 0,
                        backgroundColor: cssVar('backgroundPrimaryColor'),
                        zIndex: 1,
                        boxShadow: '-4px 0 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className={styles.tableActionBtn}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', padding: '4px' }}
                          onClick={() => {
                            setEditingIntern(cert);
                            setAddInternModalOpen(true);
                          }}
                          title="Edit Intern Record"
                        >
                          <EditIconSvg />
                        </button>
                        <button
                          className={styles.tableActionBtn}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', padding: '4px' }}
                          onClick={() => handleDownloadPdfForIntern(cert)}
                          title="Download Certificate PDF"
                        >
                          <DownloadIconSvg />
                        </button>
                        <button
                          className={styles.tableActionBtn}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            padding: '4px',
                            color: '#ef4444',
                          }}
                          onClick={() => handleDeleteIntern(cert)}
                          title="Delete Enrolled Intern (Requires OTP)"
                        >
                          <TrashIconSvg />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: cssVar('textSecondaryColor'), fontStyle: 'italic' }}>
                    No enrolled intern records found. Click "Enroll Intern" or "Bulk Import" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
        </div>
      )}

      {/* Program Modal */}
      {addProgramModalOpen && (
        <AddProgramModal
          visible={addProgramModalOpen}
          programs={programs}
          existingPrograms={programs}
          initialData={editingProgram}
          onClose={() => {
            setAddProgramModalOpen(false);
            setEditingProgram(null);
          }}
          onSubmit={handleSaveProgram}
        />
      )}

      {/* Intern Modal */}
      {addInternModalOpen && (
        <AddInternModal
          visible={addInternModalOpen}
          programs={programs}
          initialData={editingIntern}
          onClose={() => {
            setAddInternModalOpen(false);
            setEditingIntern(null);
          }}
          onSubmit={handleSaveIntern}
        />
      )}

      {/* Bulk Add Modal */}
      {bulkAddModalOpen && (
        <BulkAddModal
          visible={bulkAddModalOpen}
          programs={programs}
          onClose={() => setBulkAddModalOpen(false)}
          onSubmit={handleBulkAdd}
        />
      )}

      {/* OTP Security Verification Modal */}
      {otpModal.visible && (
        <OtpModal
          visible={otpModal.visible}
          purpose={otpModal.purpose}
          actionTitle={otpModal.actionTitle}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          otpError={otpError}
          otpSending={otpSending}
          onCancel={() => {
            setOtpModal({ visible: false, purpose: '', actionTitle: '' });
            setOtpCode('');
            setOtpError('');
          }}
          onConfirm={handleOtpConfirm}
        />
      )}
    </div>
  );
};
