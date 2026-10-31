import React, { useState, useEffect, useRef, useMemo } from 'react';
import YAML from 'yaml';
import { useCompanyProfile, resolveCompanyLogo } from '@affine/core/components/hooks/use-company-profile';
import * as styles from '../../proposals/styles.css';
import { DownloadIconSvg } from './icons';
import { generateQrSvg } from './qr_code';

interface CertificateEditorProps {
  workspaceId?: string;
  program: {
    id: number;
    program_name: string;
    program_code: string;
    category?: string;
    description?: string;
    skills?: string;
    learning_outcomes?: string;
    mentor_name?: string;
    mentor_role?: string;
  };
  otpModalVisible?: boolean;
  onBack: () => void;
  onSave: (templateData: any) => void;
  onRequestPdf: (html: string) => void;
}

export const CertificateEditor: React.FC<CertificateEditorProps> = ({
  program,
  otpModalVisible = false,
  onBack,
  onSave,
  onRequestPdf,
}) => {
  const companyProfile = useCompanyProfile();
  const authorizedPersonnels = companyProfile?.authorizedPersonnels || [];

  // Dynamic Company Details from Admin Settings (/admin/settings/company)
  const companyName = companyProfile?.companyName || 'IntoAI Technologies Pvt Ltd';
  const companyTagline = companyProfile?.companyTagline || 'Enterprise AI Research & Solutions';
  const companyLogo = useMemo(() => {
    let logo = resolveCompanyLogo(
      companyProfile?.companyLogoUrl,
      companyProfile?.companyLogoData,
      companyProfile?.logoSrc || '/CompanyLogo.png',
      companyProfile?.oneLogoData
    );
    if (logo && !logo.startsWith('data:') && !logo.startsWith('http') && !logo.startsWith('/')) {
      logo = '/' + logo;
    }
    return logo || '/CompanyLogo.png';
  }, [companyProfile]);

  // Selected authorized signatory
  const activeSignatory = authorizedPersonnels[0];
  const signatoryName = activeSignatory?.name || program.mentor_name || 'Ansan Mathew';
  const signatoryRole = activeSignatory?.role || program.mentor_role || 'Founder & Director';
  const signatureData = activeSignatory?.signatureData || '';

  // Raw HTML template & CSS
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [templateCss, setTemplateCss] = useState<string>('');
  const [viewMode, setViewMode] = useState<'yaml' | 'form'>('yaml');

  // ONLY Editable Certificate Data Fields:
  // 1. main_title
  // 2. presented_label
  // 3. statement_p3
  const [mainTitle, setMainTitle] = useState('INTERNSHIP CERTIFICATE');
  const [presentedLabel, setPresentedLabel] = useState('PRESENTED TO');
  const [statementP3, setStatementP3] = useState(
    'We acknowledge their contribution and successful completion of the internship.'
  );

  // Sample static attributes for live rendering preview canvas
  const sampleRecipientName = 'Alex Johnson';
  const sampleRole = 'AI Research Intern';
  const sampleStartDate = '01 OCTOBER 2026';
  const sampleEndDate = '31 DECEMBER 2026';
  const sampleIssueDate = '23 SEPTEMBER 2026';
  const sampleCertNo = `INT-${new Date().getFullYear()}-370888`;
  const statementP1 = `This is to certify that ${sampleRecipientName} has successfully completed an internship at ${companyName} as ${sampleRole} from ${sampleStartDate} to ${sampleEndDate}.`;
  const researchArea = program.skills || 'Autonomous AI Systems and Graph Neural Architectures';
  const projectDescription = program.learning_outcomes || 'dataset curation, model fine-tuning, and evaluation';

  // YAML text source for Structure View
  const [yamlText, setYamlText] = useState<string>('');
  const lastChangeSource = useRef<'editor' | 'form' | 'init'>('init');

  // Split-pane resizing
  const [splitPercent, setSplitPercent] = useState<number>(60);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load raw HTML template and CSS on mount
  useEffect(() => {
    Promise.all([
      fetch('/certificate_template.html').then(r => r.text()),
      fetch('/certificate_style.css').then(r => r.text()),
    ])
      .then(([html, css]) => {
        setTemplateHtml(html);
        setTemplateCss(css);
      })
      .catch(err => {
        console.error('Failed to load certificate template files:', err);
      });
  }, []);

  // Build minimal editable YAML data object
  const buildDataObject = () => ({
    main_title: mainTitle,
    presented_label: presentedLabel,
    statement_p3: statementP3,
  });

  // Sync form -> YAML
  useEffect(() => {
    if (lastChangeSource.current === 'editor') return;
    try {
      const dataObj = buildDataObject();
      setYamlText(YAML.stringify(dataObj));
    } catch (e) {
      console.error('Failed to stringify YAML:', e);
    }
  }, [mainTitle, presentedLabel, statementP3]);

  // Sync YAML -> form & live preview
  const handleYamlChange = (newYaml: string) => {
    lastChangeSource.current = 'editor';
    setYamlText(newYaml);
    try {
      const parsed = YAML.parse(newYaml);
      if (!parsed || typeof parsed !== 'object') return;

      if (parsed.main_title !== undefined) setMainTitle(String(parsed.main_title));
      else if (parsed.certificate?.main_title !== undefined) setMainTitle(String(parsed.certificate.main_title));

      if (parsed.presented_label !== undefined) setPresentedLabel(String(parsed.presented_label));
      else if (parsed.certificate?.presented_label !== undefined) setPresentedLabel(String(parsed.certificate.presented_label));

      if (parsed.statement_p3 !== undefined) setStatementP3(String(parsed.statement_p3));
      else if (parsed.details?.statement_p3 !== undefined) setStatementP3(String(parsed.details.statement_p3));
    } catch {}
  };

  // Split-pane mouse dragging
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !splitPaneRef.current) return;
      const rect = splitPaneRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const percent = (currentX / rect.width) * 100;
      if (percent >= 30 && percent <= 75) {
        setSplitPercent(percent);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Compile full live HTML for the left preview canvas
  const compiledHtml = useMemo(() => {
    if (!templateHtml) return '';

    let res = templateHtml;

    // 1. Ensure <base href="/"> is included
    if (res.includes('<head>')) {
      res = res.replace('<head>', '<head>\n  <base href="/">');
    } else {
      res = '<base href="/">' + res;
    }

    // 2. Inline CSS directly inside <style> with edge-to-edge full width
    const previewStyles = `
      html, body {
        width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        background-color: #f8fafc !important;
      }
      .certificate-container {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
        position: relative !important;
      }
      .certificate-page {
        margin: 0 !important;
        transform-origin: top left !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
      }
      @media print {
        html, body {
          overflow: visible !important;
          background: transparent !important;
        }
        .certificate-page {
          transform: none !important;
          box-shadow: none !important;
        }
      }
    `;

    const fullCssTag = `<style>\n${templateCss}\n${previewStyles}\n</style>`;
    if (res.includes('<link rel="stylesheet" href="certificate_style.css">')) {
      res = res.replace('<link rel="stylesheet" href="certificate_style.css">', fullCssTag);
    } else if (res.includes('</head>')) {
      res = res.replace('</head>', fullCssTag + '\n</head>');
    } else {
      res = fullCssTag + res;
    }

    // 3. Inject responsive auto-fitting script before </body>
    const autoScaleScript = `
      <script>
      (function() {
        function fitCertificate() {
          var page = document.querySelector('.certificate-page');
          var container = document.querySelector('.certificate-container');
          if (!page) return;
          var availW = document.documentElement.clientWidth || window.innerWidth;
          var origW = page.offsetWidth || 1122.5;
          var origH = page.offsetHeight || 793.7;
          var scale = availW / origW;
          page.style.transform = 'scale(' + scale + ')';
          page.style.transformOrigin = 'top left';
          if (container) {
            container.style.width = availW + 'px';
            container.style.height = Math.ceil(origH * scale) + 'px';
          }
        }
        window.addEventListener('resize', fitCertificate);
        window.addEventListener('load', fitCertificate);
        document.addEventListener('DOMContentLoaded', fitCertificate);
        setTimeout(fitCertificate, 10);
        setTimeout(fitCertificate, 50);
        setTimeout(fitCertificate, 150);
        setTimeout(fitCertificate, 350);
      })();
      </script>
    `;

    if (res.includes('</body>')) {
      res = res.replace('</body>', autoScaleScript + '\n</body>');
    } else {
      res = res + autoScaleScript;
    }

    // 3.5. Dynamic QR Code Replacement
    const certId = sampleCertNo || 'INT-2026-370888';
    const verifyUrl = `https://verify.intoai.ai/internship/${certId}`;
    const qrSvg = generateQrSvg(verifyUrl, 68);
    if (qrSvg) {
      res = res.replace(/<div class="header-qr-code" id="headerQrCode">[\s\S]*?<\/div>/, `<div class="header-qr-code" id="headerQrCode">${qrSvg}</div>`);
    }

    // 4. Signature replacement
    const signatureReplacement = signatureData
      ? `<div class="signature-svg-wrap" style="height: 80px; display: flex; align-items: flex-end; justify-content: flex-start; margin-bottom: -4px;"><img src="${signatureData}" alt="Signature" style="max-height: 80px; max-width: 260px; object-fit: contain;" /></div>`
      : `<div class="signature-svg-wrap"><svg viewBox="0 0 160 50" fill="none" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 12 38 C 22 18, 30 12, 38 36 C 44 42, 48 30, 52 28 C 58 24, 62 38, 68 34 C 74 30, 80 22, 88 36 C 94 40, 102 26, 110 30 C 118 34, 126 24, 134 32 C 142 38, 150 28, 156 34" /></svg></div>`;

    res = res.replace(/<div class="signature-svg-wrap">[\s\S]*?<\/div>/, signatureReplacement);

    // 5. Placeholders replacement
    const replacements: Record<string, string> = {
      '{{certificate.main_title}}': mainTitle,
      '{{certificate.presented_label}}': presentedLabel,
      '{{recipient.name}}': sampleRecipientName,
      '{{recipient.role}}': sampleRole,
      '{{recipient.start_date}}': sampleStartDate,
      '{{recipient.end_date}}': sampleEndDate,
      '{{metadata.issue_date}}': sampleIssueDate,
      '{{metadata.certificate_no}}': sampleCertNo,
      '{{details.statement_p1}}': statementP1,
      '{{details.research_area}}': researchArea,
      '{{details.project_description}}': projectDescription,
      '{{details.statement_p3}}': statementP3,
      '{{signatory.name}}': signatoryName,
      '{{signatory.designation}}': signatoryRole,
      '{{signatory.organization}}': companyName,
      '{{company.name}}': companyName,
      '{{company.tagline}}': companyTagline,
      '{{company.envision}}': 'E N V I S I O N',
      '{{company.logo}}': companyLogo,
    };

    for (const [key, val] of Object.entries(replacements)) {
      res = res.replaceAll(key, val);
    }

    return res;
  }, [
    templateHtml,
    templateCss,
    mainTitle,
    presentedLabel,
    statementP3,
    sampleRecipientName,
    sampleRole,
    sampleStartDate,
    sampleEndDate,
    sampleIssueDate,
    sampleCertNo,
    statementP1,
    researchArea,
    projectDescription,
    signatoryName,
    signatoryRole,
    signatureData,
    companyName,
    companyTagline,
    companyLogo,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Top Header Bar matching Proposals / Quotes / Letterheads */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.explorerToggleBtn} onClick={onBack} title="Back to Internships">
            <span className={styles.explorerToggleBtnText}>&larr; Back</span>
          </button>
          <div className={styles.breadcrumbSeparator}>/</div>
          <div className={styles.breadcrumbActiveDoc}>
            <span className={styles.activeDocId}>{program.program_code}</span>
            <span className={styles.activeDocTitle}>{program.program_name}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            style={{
              minHeight: '38px',
              height: '38px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
            }}
            onClick={() => onRequestPdf(compiledHtml)}
            title="Export sample PDF"
          >
            <DownloadIconSvg />
            <span>Export Sample PDF</span>
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{
              minHeight: '38px',
              height: '38px',
              padding: '0 20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 600,
            }}
            onClick={() =>
              onSave({
                main_title: mainTitle,
                presented_label: presentedLabel,
                statement_p3: statementP3,
                mainTitle,
                presentedLabel,
                statementP3,
              })
            }
          >
            Save Certificate
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div
        ref={splitPaneRef}
        className={styles.splitPane}
        style={{ display: 'flex', flexDirection: 'row', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}
      >
        {/* Left Pane: Live Certificate Preview Canvas (#f1f5f9 background) */}
        <div
          className={styles.previewPane}
          style={{
            width: `${splitPercent}%`,
            flex: `0 0 ${splitPercent}%`,
            minWidth: 0,
            height: '100%',
            backgroundColor: '#f1f5f9',
            padding: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={compiledHtml}
            title="Certificate Preview"
            className={styles.iframe}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              backgroundColor: '#ffffff',
              pointerEvents: isResizing || otpModalVisible ? 'none' : 'auto',
            }}
          />

          {/* Iframe overlay when OTP modal is open */}
          {otpModalVisible && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                right: '16px',
                bottom: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 99999,
                borderRadius: '12px',
              }}
            />
          )}

          {/* Transparent overlay while dragging resize handle */}
          {isResizing && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                zIndex: 9999,
              }}
            />
          )}
        </div>

        {/* Resizable Divider Handle */}
        <div
          className={styles.resizeHandle}
          onMouseDown={startResize}
          style={{
            width: '8px',
            flexShrink: 0,
            cursor: 'col-resize',
            backgroundColor: isResizing ? '#3b82f6' : '#e4e4e7',
            borderLeft: '1px solid #d4d4d8',
            borderRight: '1px solid #d4d4d8',
            transition: 'background-color 0.2s',
            zIndex: 20,
          }}
        />

        {/* Right Pane: Configuration Editor Pane */}
        <div
          className={styles.editorPane}
          style={{
            width: `${100 - splitPercent}%`,
            flex: `0 0 ${100 - splitPercent}%`,
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#18181b',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Editor Header Bar with Tab Switcher */}
          <div className={styles.editorHeader} style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setViewMode('yaml')}
                style={{
                  background: viewMode === 'yaml' ? '#2563eb' : 'transparent',
                  color: viewMode === 'yaml' ? '#ffffff' : '#a1a1aa',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                STRUCTURE VIEW (YAML)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('form')}
                style={{
                  background: viewMode === 'form' ? '#2563eb' : 'transparent',
                  color: viewMode === 'form' ? '#ffffff' : '#a1a1aa',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                FORM FIELDS
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#71717a' }}>Save to apply changes</div>
          </div>

          {/* Main Editor Body: ONLY main_title, presented_label, statement_p3 */}
          {viewMode === 'yaml' ? (
            <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, overflow: 'hidden', backgroundColor: '#18181b' }}>
              <textarea
                className={styles.textarea}
                value={yamlText}
                onChange={e => handleYamlChange(e.target.value)}
                spellCheck={false}
                placeholder="Certificate YAML specification..."
                style={{
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#f4f4f5',
                  backgroundColor: '#18181b',
                  border: 'none',
                  outline: 'none',
                  padding: '16px',
                  resize: 'none',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                flex: '1 1 0',
                minHeight: 0,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                color: '#f4f4f5',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Certificate Template Content
              </div>

              {/* 1. main_title */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>
                  main_title
                </label>
                <input
                  type="text"
                  value={mainTitle}
                  onChange={e => {
                    lastChangeSource.current = 'form';
                    setMainTitle(e.target.value);
                  }}
                  placeholder="INTERNSHIP CERTIFICATE"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #3f3f46',
                    backgroundColor: '#27272a',
                    color: '#f4f4f5',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 2. presented_label */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>
                  presented_label
                </label>
                <input
                  type="text"
                  value={presentedLabel}
                  onChange={e => {
                    lastChangeSource.current = 'form';
                    setPresentedLabel(e.target.value);
                  }}
                  placeholder="PRESENTED TO"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #3f3f46',
                    backgroundColor: '#27272a',
                    color: '#f4f4f5',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 3. statement_p3 */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>
                  statement_p3
                </label>
                <textarea
                  rows={4}
                  value={statementP3}
                  onChange={e => {
                    lastChangeSource.current = 'form';
                    setStatementP3(e.target.value);
                  }}
                  placeholder="We acknowledge their contribution and successful completion of the internship."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #3f3f46',
                    backgroundColor: '#27272a',
                    color: '#f4f4f5',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};