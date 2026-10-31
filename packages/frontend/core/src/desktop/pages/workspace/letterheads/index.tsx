import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useService } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { toast } from '@affine/component';
import YAML from 'yaml';
import * as styles from '../proposals/styles.css';
import { useWorkspaceCopilot, type WorkspaceCopilotContextState } from '../../../components/copilot/copilot-context-provider';
import { applyCopilotEditToYaml } from '../../../components/copilot/yaml-copilot-editor';

import {
  getAllLinePaths,
  findLineIndexForPath,
  safeInsertItem,
  safeDeleteItem,
  safeAddItem,
} from '../documents-shared/yaml-utils';
import {
  parseInlineFormatting,
  htmlToMarkdown,
} from '../documents-shared/markdown-utils';
import { CloseIconSvg } from './components/icons';
import { OtpModal } from './components/otp-modal';
import { LetterheadModal } from './components/letterhead-modal';

interface Letterhead {
  id: string;
  workspaceId: string;
  letterheadId: string;
  title: string;
  preparedDate: string;
  content: string;
  authorizedDocUrl: string;
}

const DEFAULT_LETTERHEAD_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Corporate Letterhead | IntoAI Technologies</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; }
    .page-container { width: 100%; min-height: 100vh; box-sizing: border-box; padding: 40px 50px; position: relative; }
    .top-brand-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa); }
    .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .brand-name { font-size: 22px; font-weight: 800; color: #0f172a; display: block; }
    .brand-sub { font-size: 12px; color: #64748b; font-weight: 500; }
    .company-address { text-align: right; font-size: 12px; color: #475569; line-height: 1.5; }
    .letter-meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13px; color: #475569; }
    .recipient-block { margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #1e293b; }
    .letter-subject { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 20px; padding: 10px 14px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0; }
    .letter-body { font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 36px; min-height: 250px; }
    .letter-body p { margin-bottom: 14px; }
    .signature-block { margin-top: 40px; font-size: 14px; color: #1e293b; }
    .signature-space { height: 50px; }
    .footer-container { margin-top: 50px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
    .footer-strip { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
    .bottom-brand-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa); }
    .editable-letterhead-field { transition: background 0.2s; outline: none; border-radius: 2px; }
    .editable-letterhead-field:hover, .editable-letterhead-field:focus { background: rgba(37, 99, 235, 0.08); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }
    .logo-img { max-height: 38px !important; max-width: 140px !important; height: 38px !important; width: auto !important; object-fit: contain !important; display: block; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="top-brand-bar"></div>
    <header class="header-container">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="{{company.logo}}" alt="Logo" class="logo-img" style="max-height: 38px !important; max-width: 140px !important; height: 38px !important; width: auto !important; object-fit: contain !important;" />
        <div>
          <span class="brand-name">{{company.name}}</span>
          <span class="brand-sub">{{company.tagline}}</span>
        </div>
      </div>
      <div class="company-address">
        <p>{{company.address}}</p>
        <p>Phone: {{company.phone}} | Email: {{company.email}}</p>
      </div>
    </header>
    <main class="letter-content-area">
      {{letter_content}}
    </main>
    <footer class="footer-container">
      <div class="footer-strip">
        <span>CIN: {{company.cin}}</span> | <span>PAN: {{company.pan}}</span> | <span>GSTIN: {{company.gstin}}</span> | <span>Web: {{company.website}}</span>
      </div>
    </footer>
    <div class="bottom-brand-bar"></div>
  </div>
</body>
</html>`;

import {
  useCompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  resolveCompanyLogo,
  getCompanyFieldStaticVal,
  updateCompanyProfileInHtmlDom,
  type CompanyProfile,
} from '../documents-shared/use-company-profile';

function injectLetterheadData(templateHtml: string, dataObj: any, companyProfile?: CompanyProfile): string {
  if (!templateHtml) return '';

  const cp = companyProfile || DEFAULT_COMPANY_PROFILE;
  const logoSrc = resolveCompanyLogo(cp.companyLogoUrl, cp.companyLogoData);

  const date = dataObj.metadata?.date || '';
  const refNo = dataObj.metadata?.letterhead_id || '';
  const subject = dataObj.metadata?.subject || '';

  const recipient = dataObj.recipient || {};
  const recTitle = recipient.title || 'To Whom It May Concern';
  const recName = recipient.name || '';
  const recAddr1 = recipient.address_line1 || '';
  const recAddr2 = recipient.address_line2 || '';

  const body = dataObj.body || '';
  const bodyHtml = body.split('\n\n').map((p: string) => `<p>${parseInlineFormatting(p)}</p>`).join('');

  const sender = dataObj.sender || {};
  const senderName = sender.name || '';
  const senderTitle = sender.designation || '';

  const letterContentHtml = `
    <div class="letter-meta">
      <div class="letter-date"><span class="editable-letterhead-field" data-key="metadata.date">${date}</span></div>
      <div class="letter-ref">Ref No: <span class="editable-letterhead-field" data-key="metadata.letterhead_id">${refNo}</span></div>
    </div>
    
    <div class="recipient-block">
      <strong><span class="editable-letterhead-field" data-key="recipient.title">${recTitle}</span></strong><br>
      ${recName ? `<span class="editable-letterhead-field" data-key="recipient.name">${recName}</span><br>` : '<span class="editable-letterhead-field" data-key="recipient.name">[Recipient Name]</span><br>'}
      ${recAddr1 ? `<span class="editable-letterhead-field" data-key="recipient.address_line1">${recAddr1}</span><br>` : '<span class="editable-letterhead-field" data-key="recipient.address_line1">[Address Line 1]</span><br>'}
      ${recAddr2 ? `<span class="editable-letterhead-field" data-key="recipient.address_line2">${recAddr2}</span>` : '<span class="editable-letterhead-field" data-key="recipient.address_line2">[Address Line 2]</span>'}
    </div>
    
    <div class="letter-subject">
      <strong>Subject: <span class="editable-letterhead-field" data-key="metadata.subject">${subject}</span></strong>
    </div>
    
    <div class="letter-body">
      <span class="editable-letterhead-field" data-key="body">${bodyHtml}</span>
    </div>
    
    <div class="signature-block">
      <p>Sincerely,</p>
      <div class="signature-space"></div>
      <p><strong><span class="editable-letterhead-field" data-key="sender.name">${senderName}</span></strong><br>
      <span class="editable-letterhead-field" data-key="sender.designation">${senderTitle}</span><br>
      <span class="locked-company-field" contenteditable="false" data-company-field="company.name">${cp.companyName}</span></p>
    </div>
  `;

  let rendered = updateCompanyProfileInHtmlDom(templateHtml, cp, dataObj);
  rendered = rendered.replace('{{letter_content}}', letterContentHtml);

  // Clean html attributes containing placeholders first to prevent span tags leaking into attributes
  rendered = rendered.replace(/alt="[^"]*\{\{company\.name\}\}[^"]*"/gi, 'alt="Company Logo"');
  rendered = rendered.replace(/title="[^"]*\{\{company\.name\}\}[^"]*"/gi, `title="${cp.companyName}"`);

  rendered = rendered.replaceAll('{{company.logo}}', logoSrc);
  rendered = rendered.replaceAll('{{company.name}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.name">${cp.companyName}</span>`);
  rendered = rendered.replaceAll('{{company.tagline}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.tagline">${cp.companyTagline}</span>`);
  rendered = rendered.replaceAll('{{company.address}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.address">${cp.address}</span>`);
  rendered = rendered.replaceAll('{{company.phone}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.phone">${cp.phone}</span>`);
  rendered = rendered.replaceAll('{{company.email}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.email">${cp.email}</span>`);
  rendered = rendered.replaceAll('{{company.website}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.website">${cp.websiteUrl}</span>`);
  rendered = rendered.replaceAll('{{company.cin}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.cin">${cp.cin}</span>`);
  rendered = rendered.replaceAll('{{company.pan}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.pan">${cp.pan}</span>`);
  rendered = rendered.replaceAll('{{company.gstin}}', `<span class="locked-company-field" contenteditable="false" data-company-field="company.gstin">${cp.gstin}</span>`);

  return updateCompanyProfileInHtmlDom(rendered, cp, dataObj);
}

const scriptToInject = `
<style>
.locked-company-field {
  pointer-events: none !important;
  user-select: text !important;
}
footer, .footer-container, .page-footer, .footer-strip, .footer {
  user-select: text !important;
}
footer *, .footer-container *, .page-footer *, .footer-strip *, .footer * {
  contenteditable: false !important;
  pointer-events: auto !important;
  user-select: text !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  border-color: transparent !important;
}
footer .editable-letterhead-field,
.footer-container .editable-letterhead-field,
.page-footer .editable-letterhead-field,
.footer-strip .editable-letterhead-field,
.footer .editable-letterhead-field {
  outline: none !important;
  background: transparent !important;
  cursor: default !important;
  pointer-events: none !important;
}
.logo-img, img.logo-img, header img {
  max-height: 38px !important;
  max-width: 140px !important;
  height: 38px !important;
  width: auto !important;
  object-fit: contain !important;
  display: block !important;
}
</style>
<script>
(function() {
document.querySelectorAll('.editable-letterhead-field').forEach(function(el) {
  el.contentEditable = "true";
});

document.querySelectorAll('.locked-company-field').forEach(function(el) {
  el.contentEditable = "false";
});

document.querySelectorAll('footer *, .footer-container *, .page-footer *, .footer-strip *, .footer *').forEach(function(el) {
  el.removeAttribute('contenteditable');
  el.contentEditable = "false";
  el.classList.remove('editable-letterhead-field');
  el.classList.add('locked-company-field');
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target && target.hasAttribute('data-key')) {
    const key = target.getAttribute('data-key');
    const value = target.innerHTML;
    window.parent.postMessage({
      type: 'LETTERHEAD_EDIT',
      key: key,
      value: value
    }, '*');
  }
});

document.addEventListener('click', function(event) {
  var target = event.target.closest('.editable-letterhead-field');
  if (target && target.hasAttribute('data-key')) {
    var key = target.getAttribute('data-key');
    window.parent.postMessage({
      type: 'LETTERHEAD_FIELD_CLICK',
      key: key
    }, '*');
  }
});
// Broadcast text selections for formatting / AI
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  if (selectedText) {
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      
      let isCode = false;
      let node = range.commonAncestorContainer;
      while (node && node.nodeName !== 'BODY') {
        if (node.nodeName === 'CODE') {
          isCode = true;
          break;
        }
        node = node.parentNode;
      }

      window.parent.postMessage({
        type: 'LETTERHEAD_SELECTION',
        text: selectedText,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        states: {
          bold: isBold,
          italic: isItalic,
          underline: isUnderline,
          code: isCode
        }
      }, '*');
    }
  } else {
    window.parent.postMessage({
      type: 'LETTERHEAD_SELECTION_CLEAR'
    }, '*');
  }
});

// Handle formatting commands from parent
window.addEventListener('message', (event) => {
  if (event.data?.type === 'FORMAT_COMMAND') {
    const cmd = event.data.command;
    if (cmd === 'strong') {
      document.execCommand('bold', false, null);
    } else if (cmd === 'em') {
      document.execCommand('italic', false, null);
    } else if (cmd === 'u') {
      document.execCommand('underline', false, null);
    } else if (cmd === 'code') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let codeNode = null;
        let node = range.commonAncestorContainer;
        while (node && node.nodeName !== 'BODY') {
          if (node.nodeName === 'CODE') {
            codeNode = node;
            break;
          }
          node = node.parentNode;
        }
        if (codeNode) {
          const textNode = document.createTextNode(codeNode.textContent);
          codeNode.parentNode.replaceChild(textNode, codeNode);
        } else {
          const code = document.createElement('code');
          code.textContent = selection.toString();
          range.deleteContents();
          range.insertNode(code);
        }
      }
    }
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      let parent = selection.getRangeAt(0).commonAncestorContainer;
      if (parent.nodeType === Node.TEXT_NODE) {
        parent = parent.parentNode;
      }
      const editableField = parent.closest('.editable-letterhead-field');
      if (editableField) {
        editableField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    document.dispatchEvent(new Event('selectionchange'));
  }
});
})();
</script>
`;

/** Reliably trigger a browser file download with the correct filename & extension.
 *  Uses the File System Access API (showSaveFilePicker) which shows a native
 *  OS "Save As" dialog — this works in all Electron/Chromium contexts regardless
 *  of how the environment handles blob:/data: URL download attributes.
 *  Falls back to FileReader data URL for unsupported browsers. */
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
  onProgress: (percent: number) => void
): Promise<Blob> => {
  let currentProgress = 0;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.floor(Math.random() * 5) + 2;
      if (currentProgress > 90) currentProgress = 90;
      onProgress(currentProgress);
    }
  }, 150);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      clearInterval(progressInterval);
      const errText = await res.text();
      throw new Error(errText || 'Failed to generate PDF');
    }

    clearInterval(progressInterval);

    const reader = res.body?.getReader();
    const contentLength = Number(res.headers.get('Content-Length')) || 0;
    
    if (!reader) {
      onProgress(100);
      const blob = await res.blob();
      return blob;
    }

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength > 0) {
          const actualPercent = Math.min(
            90 + Math.floor((receivedLength / contentLength) * 10),
            100
          );
          onProgress(actualPercent);
        }
      }
    }

    onProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return new Blob(chunks as any[], { type: 'application/pdf' });
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
};

export const Component = () => {
  const currentWorkspace = useService(WorkspaceService).workspace;
  const workspaceId = currentWorkspace.id;
  const companyProfile = useCompanyProfile();
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [activeLetterhead, setActiveLetterhead] = useState<Letterhead | null>(null);
  const [yamlText, setYamlText] = useState<string>('');
  const [defaultYaml, setDefaultYaml] = useState<string>('');
  const [templateHtml, setTemplateHtml] = useState<string>(DEFAULT_LETTERHEAD_TEMPLATE);

  const { setCopilotContext } = useWorkspaceCopilot();

  useEffect(() => {
    setCopilotContext((prev: WorkspaceCopilotContextState) => ({
      ...prev,
      activeTab: 'documents',
      activeDocId: activeLetterhead ? activeLetterhead.letterheadId : undefined,
      activeDocTitle: activeLetterhead ? activeLetterhead.title : undefined,
      activeDocContent: yamlText || (activeLetterhead ? activeLetterhead.content : ''),
    }));
  }, [activeLetterhead, yamlText, setCopilotContext]);

  useEffect(() => {
    const handleCopilotDocEdit = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      const { editMode, targetSection, newContent, summary } = detail;
      if (!newContent && !targetSection && !summary) return;

      setYamlText(currentYaml => {
        if (!currentYaml) return currentYaml;
        const updatedYaml = applyCopilotEditToYaml(currentYaml, {
          editMode,
          targetSection,
          newContent,
          summary,
        });

        if (updatedYaml !== currentYaml) {
          toast('Letterhead updated by Workspace Copilot');
          return updatedYaml;
        }

        return currentYaml;
      });
    };

    window.addEventListener('workspace-copilot-doc-edit', handleCopilotDocEdit);
    return () => {
      window.removeEventListener('workspace-copilot-doc-edit', handleCopilotDocEdit);
    };
  }, []);
  
  // Resizing pane
  const [splitPercent, setSplitPercent] = useState<number>(70);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [selection, setSelection] = useState<{
    text: string;
    rect: any;
    states?: {
      bold: boolean;
      italic: boolean;
      underline: boolean;
      code: boolean;
    };
  } | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const splitPaneRef = useRef<HTMLDivElement>(null);

  // OTP gated modals
  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    purpose: 'DeleteLetterhead';
  }>({ visible: false, purpose: 'DeleteLetterhead' });

  // Creation & edit popup modal state
  const [docModal, setDocModal] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    letterhead?: Letterhead;
    subject: string;
    recipientTitle: string;
    recipientName: string;
    addressLine1: string;
    addressLine2: string;
  }>({
    visible: false,
    mode: 'create',
    subject: 'Strategic Partnership & Enterprise AI Development',
    recipientTitle: 'To Whom It May Concern',
    recipientName: 'Apex Global Logistics Inc.',
    addressLine1: 'No.100 Pine Street, Suite 2400',
    addressLine2: 'San Francisco, CA 94111',
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  // Editor line syncing
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [yamlFlash, setYamlFlash] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const yamlFlashTimeoutRef = useRef<any>(null);
  const lastChangeSource = useRef<'editor' | 'iframe' | null>(null);
  const lastLoadedLetterheadRef = useRef<string | null>(null);

  // Preview Iframe Content state
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>('');

  // Dashboard state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [plusMenuOpen, setPlusMenuOpen] = useState<boolean>(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState<boolean>(false);
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [tempUrlValue, setTempUrlValue] = useState<string>('');

  const plusDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (plusDropdownRef.current && !plusDropdownRef.current.contains(e.target as Node)) {
        setPlusMenuOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchLetterheads = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/letterheads`);
      if (res.ok) {
        const data = await res.json();
        setLetterheads(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadStaticAssets = async () => {
      try {
        const tempRes = await fetch('/letterhead_template.html');
        const tempTxt = await tempRes.text();
        if (tempTxt && tempTxt.includes('{{letter_content}}')) {
          setTemplateHtml(tempTxt);
        } else {
          setTemplateHtml(DEFAULT_LETTERHEAD_TEMPLATE);
        }

        const sampleRes = await fetch('/letterhead_sample.yaml');
        const sampleTxt = await sampleRes.text();
        if (sampleTxt && !sampleTxt.includes('<!DOCTYPE')) {
          setDefaultYaml(sampleTxt);
        }
      } catch (e) {
        console.error('Failed to load letterhead static assets', e);
        setTemplateHtml(DEFAULT_LETTERHEAD_TEMPLATE);
      }
    };

    loadStaticAssets();
    fetchLetterheads();
  }, [workspaceId]);

  const loadLetterhead = (lh: Letterhead) => {
    setActiveLetterhead(lh);
    setActiveKey(null);
    lastChangeSource.current = null;
    setYamlText(lh.content);
    setSearchParams({ id: lh.letterheadId });
  };

  // Sync search parameters to active doc
  useEffect(() => {
    const lhId = searchParams.get('id');
    if (lhId) {
      if (activeLetterhead && activeLetterhead.letterheadId === lhId) return;
      if (letterheads.length > 0) {
        const match = letterheads.find(l => l.letterheadId === lhId);
        if (match) loadLetterhead(match);
      }
    } else {
      if (activeLetterhead) {
        setActiveLetterhead(null);
        setYamlText('');
      }
    }
  }, [searchParams, letterheads, activeLetterhead]);

  // Load preview iframe when yamlText changes
  useEffect(() => {
    if (!activeLetterhead) {
      lastLoadedLetterheadRef.current = null;
      return;
    }
    if (!yamlText) return;

    if (lastChangeSource.current === 'iframe') {
      lastChangeSource.current = null;
      if (iframeRef.current?.contentWindow) {
        try {
          const data = YAML.parse(yamlText);
          iframeRef.current.contentWindow.postMessage({
            type: 'UPDATE_FIELDS',
            data
          }, '*');
        } catch (e) {}
      }
      return;
    }

    const cacheKey = `${activeLetterhead.letterheadId}_${yamlText.length}`;
    try {
      const data = YAML.parse(yamlText);
      if (!templateHtml) return;

      if (lastLoadedLetterheadRef.current !== cacheKey) {
        lastLoadedLetterheadRef.current = cacheKey;
        let rendered = injectLetterheadData(templateHtml, data, companyProfile);
        
        if (rendered.includes('</body>')) {
          rendered = rendered.replace('</body>', scriptToInject + '\n</body>');
        } else {
          rendered = rendered + scriptToInject;
        }

        if (rendered.includes('<head>')) {
          rendered = rendered.replace('<head>', '<head>\n  <base href="/">');
        } else {
          rendered = '<base href="/">' + rendered;
        }
        setIframeSrcDoc(rendered);
      } else {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'UPDATE_FIELDS',
            data
          }, '*');
        }
      }
    } catch (e) {}
  }, [yamlText, templateHtml, activeLetterhead, companyProfile]);

  // Listen to iframe postMessages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'LETTERHEAD_EDIT') {
        const { key, value } = msg;
        lastChangeSource.current = 'iframe';
        try {
          const doc = YAML.parseDocument(yamlText);
          const path = key.split('.').map((p: string) => /^\d+$/.test(p) ? parseInt(p, 10) : p);
          let cleanVal = htmlToMarkdown(value).trim();
          doc.setIn(path, cleanVal);
          setYamlText(doc.toString());
        } catch (e) {}
      } else if (msg.type === 'LETTERHEAD_FIELD_CLICK') {
        setActiveKey(msg.key);
        scrollYamlToKey(msg.key, false);
      } else if (msg.type === 'LETTERHEAD_SELECTION') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection({ text: msg.text, rect: msg.rect, states: msg.states });
        }, 100);
      } else if (msg.type === 'LETTERHEAD_SELECTION_CLEAR') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection(null);
        }, 100);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [yamlText]);

  const formatButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#f3f4f6',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const handleFormatText = (tag: 'strong' | 'em' | 'u' | 'code') => {
    if (!selection) return;
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'FORMAT_COMMAND',
        command: tag
      }, '*');
    }
  };

  const getFloatingToolbarStyle = (): React.CSSProperties => {
    if (!selection || !iframeRef.current) return { display: 'none' };
    const iframeRect = iframeRef.current.getBoundingClientRect();
    const top = iframeRect.top + selection.rect.top - 48;
    const left = iframeRect.left + selection.rect.left + selection.rect.width / 2 - 68;
    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '4px',
      display: 'flex',
      gap: '4px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      border: '1px solid #374151',
    };
  };

  const scrollYamlToKey = (key: string, shouldFocus = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const lineIdx = findLineIndexForPath(yamlText, key);
    if (lineIdx === -1) return;
    
    const lines = yamlText.split('\n');
    let offset = 0;
    for (let i = 0; i < lineIdx; i++) {
      offset += lines[i].length + 1;
    }
    
    const line = lines[lineIdx];
    const colonIdx = line.indexOf(':');
    let caretPos = offset;
    if (colonIdx !== -1) {
      let valStart = colonIdx + 1;
      while (valStart < line.length && line[valStart] === ' ') {
        valStart++;
      }
      if (valStart < line.length && (line[valStart] === '"' || line[valStart] === "'")) {
        valStart++;
      }
      caretPos = offset + valStart;
    } else {
      const trimmedStart = line.search(/\S/);
      if (trimmedStart !== -1) {
        let valStart = trimmedStart;
        if (line[valStart] === '-') {
          valStart++;
          while (valStart < line.length && line[valStart] === ' ') {
            valStart++;
          }
          if (valStart < line.length && (line[valStart] === '"' || line[valStart] === "'")) {
            valStart++;
          }
        }
        caretPos = offset + valStart;
      }
    }
    
    if (shouldFocus) {
      textarea.focus();
    }
    textarea.setSelectionRange(caretPos, caretPos);
    
    const height = textarea.clientHeight;
    const newScrollTop = Math.max(0, (lineIdx * 18) - (height / 2));
    textarea.scrollTop = newScrollTop;
    setScrollTop(newScrollTop);
    
    setYamlFlash(true);
    if (yamlFlashTimeoutRef.current) clearTimeout(yamlFlashTimeoutRef.current);
    yamlFlashTimeoutRef.current = setTimeout(() => setYamlFlash(false), 1500);
  };

  const activeLineIdx = useMemo(() => {
    if (!activeKey || !yamlText) return -1;
    return findLineIndexForPath(yamlText, activeKey);
  }, [activeKey, yamlText]);

  // Format today's date nicely: e.g. "09 June 2026"
  const formatToday = () => {
    const dateObj = new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const openEditModal = (lh: Letterhead) => {
    try {
      const parsed = YAML.parse(lh.content);
      const metadata = parsed.metadata || {};
      const recipient = parsed.recipient || {};
      setDocModal({
        visible: true,
        mode: 'edit',
        letterhead: lh,
        subject: metadata.subject || '',
        recipientTitle: recipient.title || '',
        recipientName: recipient.name || '',
        addressLine1: recipient.address_line1 || '',
        addressLine2: recipient.address_line2 || '',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNew = () => {
    setDocModal({
      visible: true,
      mode: 'create',
      subject: 'Strategic Partnership & Enterprise AI Development',
      recipientTitle: 'To Whom It May Concern',
      recipientName: 'Apex Global Logistics Inc.',
      addressLine1: 'No.100 Pine Street, Suite 2400',
      addressLine2: 'San Francisco, CA 94111',
    });
  };

  const submitDocModal = async () => {
    try {
      if (docModal.mode === 'create') {
        const yamlSource = defaultYaml || '';
        let newId = '';
        let isUnique = false;
        while (!isUnique) {
          const rand = Math.floor(100000 + Math.random() * 900000);
          newId = `LH-2026-${rand}`;
          isUnique = !letterheads.some(l => l.letterheadId === newId);
        }

        const doc = YAML.parseDocument(yamlSource);
        doc.setIn(['metadata', 'letterhead_id'], newId);
        doc.setIn(['metadata', 'date'], formatToday());
        doc.setIn(['metadata', 'subject'], docModal.subject);
        doc.setIn(['recipient', 'title'], docModal.recipientTitle);
        doc.setIn(['recipient', 'name'], docModal.recipientName);
        doc.setIn(['recipient', 'address_line1'], docModal.addressLine1);
        doc.setIn(['recipient', 'address_line2'], docModal.addressLine2);

        if (companyProfile) {
          doc.setIn(['company', 'name'], companyProfile.companyName);
          doc.setIn(['company', 'tagline'], companyProfile.companyTagline);
          doc.setIn(['company', 'address'], companyProfile.address);
          doc.setIn(['company', 'phone'], companyProfile.phone);
          doc.setIn(['company', 'email'], companyProfile.email);
          doc.setIn(['company', 'website'], companyProfile.websiteUrl);
          doc.setIn(['company', 'cin'], companyProfile.cin);
          doc.setIn(['company', 'pan'], companyProfile.pan);
          doc.setIn(['company', 'gstin'], companyProfile.gstin);
        }

        const newYaml = doc.toString();
        const newLetterhead: Letterhead = {
          id: '',
          workspaceId,
          letterheadId: newId,
          title: docModal.subject || 'Letter of Authorization',
          preparedDate: new Date().toISOString(),
          content: newYaml,
          authorizedDocUrl: ''
        };

        setActiveLetterhead(newLetterhead);
        lastChangeSource.current = null;
        setYamlText(newYaml);
        setSearchParams({ id: newId });
        setDocModal(prev => ({ ...prev, visible: false }));
        toast('Letterhead draft created!');
      } else {
        const target = docModal.letterhead;
        if (!target) return;

        const doc = YAML.parseDocument(target.content);
        doc.setIn(['metadata', 'subject'], docModal.subject);
        doc.setIn(['recipient', 'title'], docModal.recipientTitle);
        doc.setIn(['recipient', 'name'], docModal.recipientName);
        doc.setIn(['recipient', 'address_line1'], docModal.addressLine1);
        doc.setIn(['recipient', 'address_line2'], docModal.addressLine2);

        const newYaml = doc.toString();
        await handleSave(target, newYaml);
        setDocModal(prev => ({ ...prev, visible: false }));
      }
    } catch (e: any) {
      toast(`Error processing: ${e.message}`);
    }
  };

  const handleSave = async (lh: Letterhead | null = activeLetterhead, directContent = yamlText) => {
    const target = lh ?? activeLetterhead;
    if (!target) return;

    try {
      const parsed = YAML.parse(directContent);
      const preparedDate = parsed.metadata?.date 
        ? new Date(parsed.metadata.date).toISOString() 
        : new Date().toISOString();

      const saveData = {
        letterheadId: target.letterheadId,
        title: parsed.metadata?.subject || target.title,
        preparedDate,
        content: directContent,
        authorizedDocUrl: parsed.metadata?.authorized_doc_url ?? target.authorizedDocUrl
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/letterheads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        const saved = await res.json();
        toast('Letterhead saved successfully!');
        await fetchLetterheads();
        if (activeLetterhead && activeLetterhead.letterheadId === saved.letterheadId) {
          setActiveLetterhead(saved);
          setYamlText(directContent);
        }
      } else {
        const err = await res.text();
        toast(`Failed to save: ${err}`);
      }
    } catch (e: any) {
      toast(`Error parsing YAML: ${e.message}`);
    }
  };

  const triggerSendOtp = async (purpose: 'DeleteLetterhead') => {
    setOtpModal({ visible: true, purpose });
    setOtpSending(true);
    setOtpError('');
    setOtpCode('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/letterheads/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose }),
      });
      if (!res.ok) {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      setOtpError(e.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleDelete = async (forceWithOtp?: string, targetLh?: Letterhead | null) => {
    const target = targetLh !== undefined ? targetLh : activeLetterhead;
    if (!target) return;

    if (!target.id) {
      // It's an unsaved draft
      setActiveLetterhead(null);
      setYamlText('');
      setSearchParams({});
      toast('Draft discarded successfully.');
      return;
    }

    if (!forceWithOtp) {
      setActiveLetterhead(target);
      triggerSendOtp('DeleteLetterhead');
      return;
    }

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/letterheads/${target.letterheadId}?otpCode=${forceWithOtp}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setOtpModal({ visible: false, purpose: 'DeleteLetterhead' });
        setOtpCode('');
        setOtpError('');
        setActiveLetterhead(null);
        setYamlText('');
        setSearchParams({});
        await fetchLetterheads();
        toast('Letterhead deleted successfully!');
      } else {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      toast(e.message);
    }
  };

  const handleSaveUrl = async (lh: Letterhead, customUrlValue: string) => {
    setEditingUrlId(null);
    if (customUrlValue === lh.authorizedDocUrl) return;

    try {
      // Sync the authorized_doc_url inside the content YAML too!
      const doc = YAML.parseDocument(lh.content);
      doc.setIn(['metadata', 'authorized_doc_url'], customUrlValue);
      const newYaml = doc.toString();

      const saveData = {
        letterheadId: lh.letterheadId,
        title: lh.title,
        preparedDate: lh.preparedDate,
        content: newYaml,
        authorizedDocUrl: customUrlValue
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/letterheads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        toast('Authorized URL updated successfully!');
        fetchLetterheads();
      } else {
        toast('Failed to update URL');
      }
    } catch (e) {
      toast('Error updating URL');
    }
  };

  const handleExportPdf = async () => {
    if (!activeLetterhead || !yamlText) return;
    try {
      toast('Compiling Letterhead PDF...');
      const parsed = YAML.parse(yamlText);
      let compiledHtml = injectLetterheadData(templateHtml, parsed);
      if (compiledHtml.includes('<head>')) {
        compiledHtml = compiledHtml.replace('<head>', '<head>\n  <base href="/">');
      } else {
        compiledHtml = '<base href="/">' + compiledHtml;
      }

      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/letterheads/pdf', { html: compiledHtml }, setDownloadProgress);
      const filename = `${activeLetterhead.letterheadId}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Letterhead PDF will be downloaded...');
    } catch (e: any) {
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const downloadLetterheadPdf = async (lh: Letterhead) => {
    try {
      toast('Compiling Letterhead PDF...');
      let rawTemplate = templateHtml;
      if (!rawTemplate || !rawTemplate.includes('{{letter_content}}')) {
        try {
          const tempRes = await fetch('/letterhead_template.html');
          if (tempRes.ok) {
            const tempTxt = await tempRes.text();
            if (tempTxt && tempTxt.includes('{{letter_content}}')) {
              rawTemplate = tempTxt;
            }
          }
        } catch (e) {}
      }
      if (!rawTemplate) rawTemplate = DEFAULT_LETTERHEAD_TEMPLATE;

      const parsed = YAML.parse(lh.content);
      let compiledHtml = injectLetterheadData(rawTemplate, parsed);
      if (compiledHtml.includes('<head>')) {
        compiledHtml = compiledHtml.replace('<head>', '<head>\n  <base href="/">');
      } else {
        compiledHtml = '<base href="/">' + compiledHtml;
      }

      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/letterheads/pdf', { html: compiledHtml }, setDownloadProgress);
      const filename = `${lh.letterheadId}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Letterhead PDF will be downloaded...');
    } catch (e: any) {
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleExportYaml = () => {
    if (!yamlText) return;
    const blob = new Blob([yamlText], { type: 'application/x-yaml' });
    const filename = `${activeLetterhead?.letterheadId || 'letterhead'}.yaml`;
    saveBlob(blob, filename);
  };

  const handleImportYaml = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = YAML.parse(text);
        const metadata = parsed?.metadata || {};
        
        const letterheadId = metadata.letterhead_id || `LH-2026-IMP-${Math.floor(100000 + Math.random() * 900000)}`;
        const title = metadata.subject || 'Imported Letterhead';
        
        const importedLetterhead: Letterhead = {
          id: '',
          workspaceId,
          letterheadId,
          title,
          preparedDate: new Date().toISOString(),
          content: text,
          authorizedDocUrl: metadata.authorized_doc_url || ''
        };

        setActiveLetterhead(importedLetterhead);
        lastChangeSource.current = null;
        setYamlText(text);
        setSearchParams({ id: letterheadId });
        toast('Imported letterhead YAML draft successfully.');
      } catch (e: any) {
        toast(`Invalid YAML layout: ${e.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Resize Handler
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!splitPaneRef.current) return;
      const rect = splitPaneRef.current.getBoundingClientRect();
      const nextPercent = ((e.clientX - rect.left) / rect.width) * 100;
      if (nextPercent > 20 && nextPercent < 80) {
        setSplitPercent(nextPercent);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Filter letterheads list
  const getFilteredLetterheads = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return letterheads;
    return letterheads.filter(l => 
      l.letterheadId.toLowerCase().includes(query) ||
      l.title.toLowerCase().includes(query) ||
      l.authorizedDocUrl.toLowerCase().includes(query)
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {activeLetterhead ? (
        /* EDITOR SPLIT PANE WORKSPACE */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
          {/* Header Bar */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.explorerToggleBtn} onClick={() => setSearchParams({})}>
                <span className={styles.explorerToggleBtnText}>&larr; Back</span>
              </button>
              <div className={styles.breadcrumbSeparator}>/</div>
              <div className={styles.breadcrumbActiveDoc}>
                <span className={styles.activeDocId}>{activeLetterhead.letterheadId}</span>
                <span className={styles.activeDocTitle}>{activeLetterhead.title}</span>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExportPdf}>
                Export PDF
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleSave()}>
                Save Letterhead
              </button>

              {/* &vellip; More Actions */}
              <div className={styles.actionsMenuWrapper} ref={actionsDropdownRef}>
                <button
                  className={styles.iconBtn}
                  onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                  title="More Actions"
                  style={{ height: '30px', width: '30px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>
                {actionsMenuOpen && (
                  <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto', minWidth: '180px' }}>
                    <button
                      className={styles.dropdownItem}
                      onClick={() => { handleExportYaml(); setActionsMenuOpen(false); }}
                      disabled={!yamlText}
                    >
                      <span>Export YAML</span>
                    </button>
                    <button
                      className={styles.dropdownItem}
                      onClick={() => { fileInputRef.current?.click(); setActionsMenuOpen(false); }}
                    >
                      <span>Import YAML</span>
                    </button>
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={() => { handleDelete(); setActionsMenuOpen(false); }}
                    >
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Split Editor */}
          <div
            style={{ display: 'flex', flexDirection: 'row', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}
            ref={splitPaneRef}
          >
            {/* Live Template Preview */}
            <div
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
                srcDoc={iframeSrcDoc}
                title="Letterhead Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                  backgroundColor: '#ffffff',
                  pointerEvents: (isResizing || otpModal.visible) ? 'none' : 'auto',
                }}
              />
              {/* Iframe overlay when OTP modal is open */}
              {otpModal.visible && (
                <div style={{
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
                }} />
              )}
            </div>

            {/* Resizer */}
            <div
              style={{
                width: '8px',
                flexShrink: 0,
                cursor: 'col-resize',
                backgroundColor: isResizing ? '#3b82f6' : '#e2e8f0',
                borderLeft: '1px solid #d4d4d8',
                borderRight: '1px solid #d4d4d8',
                transition: 'background-color 0.2s',
                zIndex: 20,
              }}
              onMouseDown={startResize}
            />

            {/* YAML Editor */}
            <div
              style={{
                width: `${100 - splitPercent}%`,
                flex: `0 0 ${100 - splitPercent}%`,
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#18181b',
                borderLeft: '1px solid var(--affine-border-color)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 16px', backgroundColor: '#27272a', borderBottom: '1px solid #3f3f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa' }}>Letterhead YAML Config</span>
                  {activeKey && (
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500 }}>
                      Active: {activeKey}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Save manually to apply</div>
              </div>
              <div style={{ position: 'relative', flex: '1 1 0', minHeight: 0, overflow: 'hidden', backgroundColor: '#18181b' }}>
                {activeLineIdx !== -1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      top: `${16 + (activeLineIdx * 18) - scrollTop}px`,
                      height: '18px',
                      backgroundColor: 'rgba(37, 99, 235, 0.15)',
                      borderLeft: '3px solid #2563eb',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                )}
                <textarea
                  ref={textareaRef}
                  className={`${styles.textarea} ${yamlFlash ? 'highlight-flash' : ''}`}
                  value={yamlText}
                  onChange={e => {
                    lastChangeSource.current = 'editor';
                    setYamlText(e.target.value);
                  }}
                  onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                  wrap="off"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'transparent',
                    lineHeight: '18px',
                    whiteSpace: 'pre',
                    overflowX: 'auto',
                    margin: 0,
                    padding: '16px',
                    width: '100%',
                    height: '100%',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '13px',
                    color: '#f4f4f5',
                    transition: 'box-shadow 0.3s ease',
                    boxShadow: yamlFlash ? '0 0 0 2px rgba(251, 191, 36, 0.5)' : undefined,
                  }}
                  placeholder="# YAML letterhead content..."
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DASHBOARD VIEW */
        <div className={styles.dashboardContainer}>
          <div className={styles.dashboardHeader}>
            <div>
              <h1 className={styles.dashboardTitle}>Corporate Letterheads</h1>
              <p className={styles.dashboardSubtitle}>
                Create standalone business letters, generate PDF copies, and link authorized copies.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
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
                  placeholder="Search letterheads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>              {/* New & Import buttons */}
              <button 
                className={styles.plusBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Import YAML File"
                style={{ height: '32px', width: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="11" x2="12" y2="17"></line>
                  <polyline points="9 14 12 17 15 14"></polyline>
                </svg>
              </button>

              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleCreateNew}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>New Letterhead</span>
              </button>
            </div>
          </div>
 
          {/* Letterheads Table */}
          <div className={styles.dashboardCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Letterhead ID</th>
                  <th style={{ width: '18%' }}>Date</th>
                  <th>Subject</th>
                  <th style={{ width: '30%' }}>Authorized Doc URL</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredLetterheads().length > 0 ? (
                  getFilteredLetterheads().map(item => (
                    <tr key={item.id} className={styles.tableRow} onClick={() => loadLetterhead(item)}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={item.letterheadId}>
                          {item.letterheadId}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={new Date(item.preparedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}>
                          {new Date(item.preparedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={item.title}>
                          {item.title}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {editingUrlId === item.id ? (
                          <input
                            type="text"
                            value={tempUrlValue}
                            onChange={(e) => setTempUrlValue(e.target.value)}
                            onBlur={() => handleSaveUrl(item, tempUrlValue)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveUrl(item, tempUrlValue);
                              if (e.key === 'Escape') setEditingUrlId(null);
                            }}
                            autoFocus
                            style={{
                              width: '95%',
                              padding: '4px 8px',
                              border: '1px solid #0F62FE',
                              borderRadius: '4px',
                              fontSize: '12px',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingUrlId(item.id);
                              setTempUrlValue(item.authorizedDocUrl || '');
                            }}
                            style={{
                              minHeight: '24px',
                              cursor: 'pointer',
                              color: item.authorizedDocUrl ? '#0F62FE' : '#888',
                              textDecoration: item.authorizedDocUrl ? 'underline' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title={item.authorizedDocUrl || 'Click to enter URL'}
                          >
                            {item.authorizedDocUrl ? (
                              <>
                                <span style={{ display: 'inline-block', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                  {item.authorizedDocUrl}
                                </span>
                                <a
                                  href={item.authorizedDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontSize: '10px', color: '#6b7280', display: 'inline-flex', alignSelf: 'center' }}
                                >
                                  &#8599;
                                </a>
                              </>
                            ) : (
                              <span style={{ fontStyle: 'italic', fontSize: '11px', color: '#9ca3af' }}>Click to enter URL</span>
                            )}
                          </div>
                        )}
                      </td>
                       <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            className={styles.tableActionBtn}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                            onClick={() => openEditModal(item)}
                            title="Edit Info"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className={styles.tableActionBtn}
                            onClick={() => loadLetterhead(item)}
                          >
                            Open
                          </button>
                          <button
                            className={styles.tableActionBtn}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                            onClick={() => {
                              downloadLetterheadPdf(item);
                            }}
                            title="Download PDF"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#888', fontStyle: 'italic' }}>
                      No letterheads found. Click "New Letterhead" above to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportYaml}
        accept=".yaml,.yml"
        style={{ display: 'none' }}
      />

      {/* OTP Security Verification Modal */}
      {selection && (
        <div style={getFloatingToolbarStyle()}>
          <button
            style={{
              ...formatButtonStyle,
              backgroundColor: selection.states?.bold ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.bold ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.bold ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.bold ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('strong')}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            style={{
              ...formatButtonStyle,
              backgroundColor: selection.states?.italic ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.italic ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.italic ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.italic ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('em')}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            style={{
              ...formatButtonStyle,
              backgroundColor: selection.states?.underline ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.underline ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.underline ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.underline ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('u')}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            style={{
              ...formatButtonStyle,
              fontFamily: 'monospace',
              fontSize: '11px',
              backgroundColor: selection.states?.code ? 'rgba(168, 85, 247, 0.35)' : 'transparent',
              border: selection.states?.code ? '1px solid rgba(168, 85, 247, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = selection.states?.code ? 'rgba(168, 85, 247, 0.45)' : 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selection.states?.code ? 'rgba(168, 85, 247, 0.35)' : 'transparent'; }}
            onClick={() => handleFormatText('code')}
            title="Code"
          >
            &lt;/&gt;
          </button>
        </div>
      )}

      <OtpModal
        visible={otpModal.visible}
        purpose={otpModal.purpose}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        otpError={otpError}
        otpSending={otpSending}
        onCancel={() => setOtpModal({ visible: false, purpose: 'DeleteLetterhead' })}
        onConfirm={(code) => handleDelete(code, activeLetterhead || undefined)}
      />
      {downloadProgress !== null && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000
        }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '28px',
            borderRadius: '16px',
            width: '380px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.80)'
          }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '20px' }}>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '4px solid #f1f5f9',
                borderTopColor: '#2563eb',
                animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
              }}></div>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                color: '#1e293b',
                fontFamily: 'system-ui, sans-serif'
              }}>
                {downloadProgress}%
              </div>
            </div>
            
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontFamily: 'system-ui, sans-serif' }}>
              Generating A4 PDF
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.4 }}>
              Compiling document and applying premium styles. Please wait...
            </p>

            <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${downloadProgress}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                borderRadius: '3px',
                transition: 'width 0.2s ease-out'
              }}></div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <LetterheadModal
        docModal={docModal}
        setDocModal={setDocModal}
        onSubmit={submitDocModal}
      />
    </div>
  );
};
