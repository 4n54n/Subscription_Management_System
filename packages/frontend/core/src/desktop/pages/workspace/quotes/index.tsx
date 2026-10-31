import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useService } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { toast } from '@affine/component';
import YAML from 'yaml';
import * as styles from '../proposals/styles.css';
import { applyCopilotEditToYaml } from '../../../components/copilot/yaml-copilot-editor';

import {
  getAllLinePaths,
  findLineIndexForPath,
  getPlaceholderText,
  safeInsertItem,
  safeDeleteItem,
  safeAddItem,
} from '../documents-shared/yaml-utils';
import {
  parseInlineFormatting,
  htmlToMarkdown,
} from '../documents-shared/markdown-utils';
import { CurrencyDropdown } from '../documents-shared/currency-dropdown';
import { CloseIconSvg } from './components/icons';
import { OtpModal } from './components/otp-modal';
import { QuoteModal } from './components/quote-modal';
import { useWorkspaceCopilot } from '../../../components/copilot/copilot-context-provider';

interface Quote {
  id: string;
  workspaceId: string;
  quoteId: string;
  version: string;
  title: string;
  preparedFor: string;
  preparedDate: string;
  content: string;
  status: string;
  proposalIdConnect?: string;
}

interface Proposal {
  id: string;
  workspaceId: string;
  proposalId: string;
  version: string;
  title: string;
  preparedFor: string;
  preparedDate: string;
  content: string;
}

import {
  useCompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  resolveCompanyLogo,
  getCompanyFieldStaticVal,
  updateCompanyProfileInHtmlDom,
  type CompanyProfile,
} from '../documents-shared/use-company-profile';

function injectQuoteData(templateHtml: string, dataObj: any, companyProfile?: CompanyProfile): string {
  if (!templateHtml) return '';

  const cp = companyProfile || DEFAULT_COMPANY_PROFILE;
  let html = updateCompanyProfileInHtmlDom(templateHtml, cp, dataObj);

  const items = dataObj.items || [];
  let subtotal = 0;
  let rowsHtml = '';

  const currencySymbol = dataObj.metadata?.currency || '₹';

  items.forEach((item: any, idx: number) => {
    const qty = parseFloat(item.qty || item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amt = qty * rate;
    subtotal += amt;

    rowsHtml += `
      <tr data-index="${idx}">
        <td class="align-center item-num">0${idx + 1}</td>
        <td>
          <div class="item-name editable-quote-field" data-key="items.${idx}.name" contenteditable="true">${item.name || '[Enter Name]'}</div>
          <div class="item-desc editable-quote-field" data-key="items.${idx}.desc" contenteditable="true">${item.desc || '[Enter Description]'}</div>
        </td>
        <td class="align-center"><span class="editable-quote-field" data-key="items.${idx}.qty" contenteditable="true">${qty}</span></td>
        <td class="align-right rate-col"><span class="editable-quote-field" data-key="items.${idx}.rate" contenteditable="true">${currencySymbol}${rate.toLocaleString('en-IN')}</span></td>
        <td class="align-right amount-col">${currencySymbol}${amt.toLocaleString('en-IN')}</td>
        <td style="width: 50px; text-align: center;" class="table-action-btn-col">
          <button class="table-action-btn insert-btn" onclick="insertQuoteItem(${idx})">+</button>
          <button class="table-action-btn delete-btn" onclick="deleteQuoteItem(${idx})">×</button>
        </td>
      </tr>
    `;
  });

  if (rowsHtml === '') {
    rowsHtml = '<tr><td colspan="5" style="text-align: center; color: #888;">No items added yet. Click "+ Add Item" below to start.</td></tr>';
  }

  const gstRate = parseFloat(dataObj.financials?.gst_rate) || 18;
  const gst = subtotal * (gstRate / 100);
  const total = subtotal + gst;

  let docId = dataObj.metadata?.quote_id || '[Quote ID]';
  let status = dataObj.metadata?.status || 'Pending Approval';
  let sLower = status.toLowerCase().trim();
  let statusClass = 'pending';
  if (sLower === 'unpaid' || sLower.startsWith('unpaid')) {
    statusClass = 'unpaid';
  } else if (sLower === 'paid' || sLower.startsWith('paid')) {
    statusClass = 'paid';
  } else if (sLower.includes('approved') || sLower.includes('accepted')) {
    statusClass = 'approved';
  }

  let rendered = html
    .replace('{{pricing_table_rows}}', rowsHtml)
    .replace('{{doc_type}} ID:', 'Quote ID:')
    .replace('{{doc_type}}', 'Quote')
    .replace('{{doc_id}}', `<span data-key="metadata.quote_id" class="editable-quote-field" contenteditable="true">${docId}</span>`)
    .replace('{{status}}', `<span data-key="metadata.status" class="editable-quote-field" contenteditable="true">${status}</span>`)
    .replace('{{status_class}}', statusClass)
    .replace('{{date_label}}', 'Validity Date')
    .replace('{{date_value}}', `<span data-key="metadata.validity" class="editable-quote-field" contenteditable="true">${dataObj.metadata?.validity || '[Validity Date]'}</span>`)
    .replace('{{terms_title}}', `<span data-key="terms.title" class="editable-quote-field" contenteditable="true">${dataObj.terms?.title || 'Acceptance'}</span>`)
    .replace('{{terms_text}}', `<span data-key="terms.text" class="editable-quote-field" contenteditable="true">${dataObj.terms?.text || 'Acceptance terms and criteria'}</span>`)
    .replace('{{financials.subtotal}}', `<span class="quote-subtotal-value">${currencySymbol}${subtotal.toLocaleString('en-IN')}</span>`)
    .replace('{{financials.gst_rate}}', `<span class="quote-gst-rate-value editable-quote-field" data-key="financials.gst_rate" contenteditable="true">${gstRate}</span>`)
    .replace('{{financials.gst}}', `<span class="quote-gst-value">${currencySymbol}${gst.toLocaleString('en-IN')}</span>`)
    .replace('{{financials.total}}', `<span class="quote-total-value">${currencySymbol}${total.toLocaleString('en-IN')}</span>`);

  rendered = rendered
    .replaceAll('{{doc_type}}', 'Quote')
    .replaceAll('{{doc_id}}', docId);

  // Replace basic metadata / header / cover placeholders
  rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (_match, pathStr) => {
    const cleanPath = pathStr.trim();
    if (cleanPath === 'pricing_table_rows' || cleanPath.startsWith('financials.')) return _match;

    const companyStatic = getCompanyFieldStaticVal(cleanPath, cp, dataObj);
    if (companyStatic !== null) {
      return `<span class="locked-company-field" contenteditable="false" data-company-field="${cleanPath}">${companyStatic}</span>`;
    }
    
    const path = cleanPath.split('.');
    let val = dataObj;
    for (const p of path) {
      if (val && typeof val === 'object') {
        const idx = /^\d+$/.test(p) ? parseInt(p, 10) : p;
        val = val[idx];
      } else {
        val = undefined;
        break;
      }
    }
    const valStr = val !== undefined && val !== null ? String(val).trim() : '';
    const isDefaultPlaceholder = valStr.includes('[Select') || valStr === '' || valStr.toLowerCase() === 'none';
    let displayVal = isDefaultPlaceholder ? getPlaceholderText(cleanPath) : parseInlineFormatting(valStr);
    if (isDefaultPlaceholder && (cleanPath.includes('reference') || cleanPath.includes('id') || cleanPath.includes('proposal') || cleanPath.includes('quote') || cleanPath === 'project.name')) {
      if (cleanPath !== 'metadata.quote_id') {
        displayVal = 'NA';
      }
    }
    return `<span data-key="${cleanPath}" class="editable-quote-field" contenteditable="true">${displayVal}</span>`;
  });

  return updateCompanyProfileInHtmlDom(rendered, cp, dataObj);
};


const scriptToInject = `
<style>
.table-action-btn-col {
  opacity: 0.1;
  transition: opacity 0.2s;
}
tr:hover .table-action-btn-col {
  opacity: 1;
}
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
footer .editable-quote-field,
.footer-container .editable-quote-field,
.page-footer .editable-quote-field,
.footer-strip .editable-quote-field,
.footer .editable-quote-field {
  outline: none !important;
  background: transparent !important;
  cursor: default !important;
  pointer-events: none !important;
}
.status-pill.pending {
  background: rgba(245, 158, 11, 0.08) !important;
  border: 1px solid rgba(245, 158, 11, 0.25) !important;
  color: #D97706 !important;
}
.status-pill.approved {
  background: rgba(37, 99, 235, 0.08) !important;
  border: 1px solid rgba(37, 99, 235, 0.25) !important;
  color: #2563EB !important;
}
.status-pill.paid {
  background: rgba(5, 150, 105, 0.08) !important;
  border: 1px solid rgba(5, 150, 105, 0.25) !important;
  color: #059669 !important;
}
.status-pill.unpaid {
  background: rgba(239, 68, 68, 0.12) !important;
  border: 1px solid rgba(239, 68, 68, 0.35) !important;
  color: #DC2626 !important;
}
.status-pill.unpaid, .status-pill.unpaid span, .status-pill.unpaid * {
  color: #DC2626 !important;
}
</style>
<script>
// Make fields editable
document.querySelectorAll('.editable-quote-field').forEach(el => {
  el.contentEditable = "true";
});

document.querySelectorAll('.locked-company-field').forEach(el => {
  el.contentEditable = "false";
});

document.querySelectorAll('footer *, .footer-container *, .page-footer *, .footer-strip *, .footer *').forEach(function(el) {
  el.removeAttribute('contenteditable');
  el.contentEditable = "false";
  el.classList.remove('editable-quote-field');
  el.classList.add('locked-company-field');
});

// Broadcast edits back to parent window
document.addEventListener('input', (event) => {
  const target = event.target;
  if (target && target.hasAttribute('data-key')) {
    const key = target.getAttribute('data-key');
    const value = target.innerHTML;
    window.parent.postMessage({
      type: 'QUOTE_EDIT',
      key: key,
      value: value
    }, '*');
  }
});

// Handle click on editable field to sync with YAML editor on right
document.addEventListener('click', (event) => {
  const target = event.target.closest('.editable-quote-field');
  if (target && target.hasAttribute('data-key')) {
    const key = target.getAttribute('data-key');
    window.parent.postMessage({
      type: 'QUOTE_FIELD_CLICK',
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
        type: 'QUOTE_SELECTION',
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
      type: 'QUOTE_SELECTION_CLEAR'
    }, '*');
  }
});

// Handle selection replacements
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
      const editableField = parent.closest('.editable-quote-field');
      if (editableField) {
        editableField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    document.dispatchEvent(new Event('selectionchange'));
  } else if (event.data?.type === 'UPDATE_FIELDS') {
    const data = event.data.data;
    const currencySymbol = data.metadata?.currency || '₹';
    
    // If the number of items changed, rebuild table rows in the DOM instead of reloading
    const renderedRows = document.querySelectorAll('tr[data-index]').length;
    const dataRows = (data.items || []).length;
    if (renderedRows !== dataRows) {
      const items = data.items || [];
      const tbody = document.getElementById('pricing-table-body');
      if (tbody) {
        let rowsHtml = '';
        items.forEach((item, idx) => {
          const qty = parseFloat(item.qty) || 0;
          const rate = parseFloat(item.rate) || 0;
          const amt = qty * rate;
          
          rowsHtml += \`
            <tr data-index="\${idx}">
              <td class="item-num">\${item.num || String(idx + 1).padStart(2, '0')}</td>
              <td>
                <div class="item-name editable-quote-field" data-key="items.\${idx}.name" contenteditable="true">\${item.name || '[Enter Name]'}</div>
                <div class="item-desc editable-quote-field" data-key="items.\${idx}.desc" contenteditable="true">\${item.desc || '[Enter Description]'}</div>
              </td>
              <td class="align-center"><span class="editable-quote-field" data-key="items.\${idx}.qty" contenteditable="true">\${qty}</span></td>
              <td class="align-right rate-col"><span class="editable-quote-field" data-key="items.\${idx}.rate" contenteditable="true">\${currencySymbol}\${rate.toLocaleString('en-IN')}</span></td>
              <td class="align-right amount-col">\${currencySymbol}\${amt.toLocaleString('en-IN')}</td>
              <td style="width: 50px; text-align: center;" class="table-action-btn-col">
                <button class="table-action-btn insert-btn" onclick="insertQuoteItem(\${idx})">+</button>
                <button class="table-action-btn delete-btn" onclick="deleteQuoteItem(\${idx})">×</button>
              </td>
            </tr>
          \`;
        });
        if (items.length === 0) {
          rowsHtml = '<tr><td colspan="5" style="text-align: center; color: #888;">No items added yet. Click "+ Add Item" below to start.</td></tr>';
        }
        tbody.innerHTML = rowsHtml;
      }
    }

    document.querySelectorAll('.editable-quote-field').forEach(el => {
      const key = el.getAttribute('data-key');
      if (!key) return;
      const path = key.split('.');
      let val = data;
      for (const p of path) {
        if (val && typeof val === 'object') {
          const idx = /^\\d+$/.test(p) ? parseInt(p, 10) : p;
          val = val[idx];
        } else {
          val = undefined;
          break;
        }
      }
      
      let valStr = val !== undefined && val !== null ? String(val).trim() : '';
      let isDefaultPlaceholder = valStr.includes('[Select') || valStr === '' || valStr.toLowerCase() === 'none';
      let cleanKey = key || '';
      let isRefKey = cleanKey.includes('reference') || cleanKey.includes('id') || cleanKey.includes('proposal') || cleanKey.includes('quote') || cleanKey === 'project.name';
      if (isDefaultPlaceholder && isRefKey) {
        if (cleanKey !== 'metadata.quote_id') {
          valStr = 'NA';
          isDefaultPlaceholder = false;
        }
      }

      let formattedVal = '';
      if (key.endsWith('.rate')) {
        const rateVal = parseFloat(valStr) || 0;
        formattedVal = currencySymbol + rateVal.toLocaleString('en-IN');
      } else if (key.endsWith('.qty')) {
        formattedVal = String(parseFloat(valStr) || 0);
      } else {
        let formatted = valStr.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>');
        formatted = formatted.replace(/\\n/g, '<br>');
        formattedVal = !isDefaultPlaceholder ? formatted : '[Enter Value]';
      }
      
      if (document.activeElement === el) return;
      if (el.innerHTML !== formattedVal) {
        el.innerHTML = formattedVal;
      }
    });

    // Update status pill styling dynamically
    const statusPill = document.querySelector('.status-pill');
    if (statusPill && data.metadata?.status) {
      const rawStatus = (data.metadata.status || '').toLowerCase().trim();
      statusPill.classList.remove('approved', 'paid', 'pending', 'unpaid');
      if (rawStatus === 'unpaid' || rawStatus.startsWith('unpaid')) {
        statusPill.classList.add('unpaid');
      } else if (rawStatus === 'paid' || rawStatus.startsWith('paid')) {
        statusPill.classList.add('paid');
      } else if (rawStatus.includes('approved') || rawStatus.includes('accepted')) {
        statusPill.classList.add('approved');
      } else {
        statusPill.classList.add('pending');
      }
    }

    // Recalculate quote row amounts and totals
    const items = data.items || [];
    let subtotal = 0;
    items.forEach((item, idx) => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      subtotal += amt;
      
      const row = document.querySelector(\`tr[data-index="\${idx}"]\`);
      if (row) {
        const amtCol = row.querySelector('.amount-col');
        if (amtCol) {
          const amtStr = currencySymbol + amt.toLocaleString('en-IN');
          if (amtCol.innerHTML !== amtStr) amtCol.innerHTML = amtStr;
        }
      }
    });

    const subtotalEl = document.querySelector('.quote-subtotal-value');
    if (subtotalEl) {
      const subtotalStr = currencySymbol + subtotal.toLocaleString('en-IN');
      if (subtotalEl.innerHTML !== subtotalStr) subtotalEl.innerHTML = subtotalStr;
    }

    const gstRate = parseFloat(data.financials?.gst_rate) || 18;
    const gstAmount = subtotal * (gstRate / 100);
    const gstEl = document.querySelector('.quote-gst-value');
    if (gstEl) {
      const gstStr = currencySymbol + gstAmount.toLocaleString('en-IN');
      if (gstEl.innerHTML !== gstStr) gstEl.innerHTML = gstStr;
    }

    const gstRateEl = document.querySelector('.quote-gst-rate-value');
    if (gstRateEl) {
      if (gstRateEl.innerHTML !== String(gstRate)) gstRateEl.innerHTML = String(gstRate);
    }

    const total = subtotal + gstAmount;
    const totalEl = document.querySelector('.quote-total-value');
    if (totalEl) {
      const totalStr = currencySymbol + total.toLocaleString('en-IN');
      if (totalEl.innerHTML !== totalStr) totalEl.innerHTML = totalStr;
    }
  } else if (event.data?.type === 'HIGHLIGHT_FIELD') {
    const key = event.data.key;
    const el = document.querySelector(\`.editable-quote-field[data-key="\${key}"]\`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('highlight-flash');
      void el.offsetWidth;
      el.classList.add('highlight-flash');
    }
  }
});
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

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [defaultYaml, setDefaultYaml] = useState<string>('');

  const [yamlText, setYamlText] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>('');
  const lastChangeSource = useRef<'editor' | 'iframe' | null>(null);

  const [scrollTop, setScrollTop] = useState(0);
  const activeLineIdx = useMemo(() => {
    if (!activeKey || !yamlText) return -1;
    return findLineIndexForPath(yamlText, activeKey);
  }, [activeKey, yamlText]);

  // OTP gated modals
  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    purpose: 'EditQuote' | 'DeleteQuote';
    pendingSaveData?: any;
  }>({
    visible: false,
    purpose: 'EditQuote',
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Creation & edit popup modal state
  const [docModal, setDocModal] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    quote?: Quote;
    shortTitle: string;
    companyName: string;
    lead: string;
    email: string;
    phone: string;
    currency: string;
  }>({
    visible: false,
    mode: 'create',
    shortTitle: 'AI PM QUOTE',
    companyName: 'Example Company Inc.',
    lead: 'Sarah Jenkins · Chief Information Officer',
    email: 'sarah.jenkins@example.com',
    phone: '+1 (555) 902-3481',
    currency: '₹',
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [yamlFlash, setYamlFlash] = useState(false);
  const yamlFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<{ [key: string]: boolean }>({});

  const [splitPercent, setSplitPercent] = useState(70);
  const [isResizing, setIsResizing] = useState(false);
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

  // Dropdown states
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Dropdown refs for click outside detection
  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const STATUS_OPTIONS = [
    { value: 'Pending Approval', label: 'Pending Approval', color: '#D97706', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
    { value: 'Approved', label: 'Approved', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.3)' },
    { value: 'Paid', label: 'Paid', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.3)' },
    { value: 'Unpaid', label: 'Unpaid', color: '#DC2626', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
  ];

  const currentStatus = useMemo(() => {
    try {
      if (yamlText) {
        const parsed = YAML.parse(yamlText);
        if (parsed?.metadata?.status) return parsed.metadata.status;
      }
    } catch {}
    return activeQuote?.status || 'Pending Approval';
  }, [yamlText, activeQuote]);

  const handleStatusChange = (newStatus: string) => {
    setStatusMenuOpen(false);
    if (!yamlText) return;
    try {
      const doc = YAML.parseDocument(yamlText);
      doc.setIn(['metadata', 'status'], newStatus);
      const updatedYaml = doc.toString();
      setYamlText(updatedYaml);
      lastChangeSource.current = 'editor';
      if (activeQuote) {
        setActiveQuote(prev => prev ? { ...prev, status: newStatus, content: updatedYaml } : null);
      }
      toast(`Quote status updated to "${newStatus}"`);
    } catch (e: any) {
      console.error('Failed to change status', e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(target)) {
        setVersionMenuOpen(false);
      }
      if (plusDropdownRef.current && !plusDropdownRef.current.contains(target)) {
        setPlusMenuOpen(false);
      }
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(target)) {
        setActionsMenuOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!splitPaneRef.current) return;
      const rect = splitPaneRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      if (percent > 20 && percent < 80) {
        setSplitPercent(percent);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };



  const getGroupedQuotes = () => {
    const filtered = quotes.filter(q => {
      const query = searchQuery.toLowerCase();
      return (
        q.quoteId.toLowerCase().includes(query) ||
        q.title.toLowerCase().includes(query) ||
        q.preparedFor.toLowerCase().includes(query)
      );
    });

    const groups: { [key: string]: Quote[] } = {};
    filtered.forEach(q => {
      if (!groups[q.quoteId]) {
        groups[q.quoteId] = [];
      }
      groups[q.quoteId].push(q);
    });

    return Object.keys(groups).map(quoteId => {
      const sorted = groups[quoteId].sort((a, b) => {
        const vA = parseFloat(a.version) || 0;
        const vB = parseFloat(b.version) || 0;
        return vB - vA;
      });
      const latest = sorted[0];
      return {
        quoteId,
        title: latest.title,
        preparedFor: latest.preparedFor,
        latestDate: latest.preparedDate,
        versions: sorted
      };
    }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocs(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  // Load static templates and DB listings
  useEffect(() => {
    const loadStaticAssets = async () => {
      try {
        const templateRes = await fetch('/quotation_template.html');
        const templateTxt = await templateRes.text();
        setTemplateHtml(templateTxt);

        const sampleRes = await fetch('/quote_sample.yaml');
        const sampleTxt = await sampleRes.text();
        setDefaultYaml(sampleTxt);
      } catch (e) {
        console.error('Failed to load quote static assets', e);
      }
    };

    loadStaticAssets();
    fetchQuotes();
    fetchProposals();
  }, [workspaceId]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/quotes`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/proposals`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadQuote = (quote: Quote) => {
    setActiveQuote(quote);
    setActiveKey(null);
    lastChangeSource.current = null;
    setYamlText(quote.content);
    setExpandedDocs(prev => ({ ...prev, [quote.quoteId]: true }));
    setSearchParams({ id: quote.quoteId, v: quote.version });
  };

  useEffect(() => {
    const qId = searchParams.get('id');
    const qVer = searchParams.get('v');
    
    if (qId && qVer) {
      if (activeQuote && activeQuote.quoteId === qId && activeQuote.version === qVer) return;
      if (quotes.length > 0) {
        const match = quotes.find(q => q.quoteId === qId && q.version === qVer);
        if (match) loadQuote(match);
      }
    } else {
      if (activeQuote) {
        setActiveQuote(null);
        setActiveKey(null);
        setYamlText('');
      }
    }
  }, [searchParams, quotes, activeQuote]);

  const { setCopilotContext } = useWorkspaceCopilot();

  useEffect(() => {
    setCopilotContext(prev => ({
      ...prev,
      activeTab: 'documents',
      activeDocId: activeQuote ? `${activeQuote.quoteId}-v${activeQuote.version}` : undefined,
      activeDocTitle: activeQuote ? `${activeQuote.title} (v${activeQuote.version})` : undefined,
      activeDocContent: yamlText || (activeQuote ? activeQuote.content : ''),
    }));
  }, [activeQuote, yamlText, setCopilotContext]);

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
          toast('Quote updated by Workspace Copilot');
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

  // Load preview iframe when yamlText changes
  const lastLoadedQuoteRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeQuote) {
      lastLoadedQuoteRef.current = null;
      return;
    }
    if (!templateHtml || !yamlText) return;

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

    const quoteKey = `${activeQuote.quoteId}_${activeQuote.version}`;
    try {
      const data = YAML.parse(yamlText);
      if (lastLoadedQuoteRef.current !== quoteKey) {
        lastLoadedQuoteRef.current = quoteKey;
        let rendered = injectQuoteData(templateHtml, data, companyProfile);
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
        // Real-time fields update via postMessage
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'UPDATE_FIELDS',
            data
          }, '*');
        }
      }
    } catch (e) {
      // Catch syntax errors during typing
    }
  }, [yamlText, templateHtml, activeQuote, companyProfile]);

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

  // Listen to iframe postMessages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'QUOTE_EDIT') {
        const { key, value } = msg;
        lastChangeSource.current = 'iframe';
        try {
          const doc = YAML.parseDocument(yamlText);
          const path = key.split('.').map((p: string) => /^\d+$/.test(p) ? parseInt(p, 10) : p);
          let cleanVal = htmlToMarkdown(value).trim();
          if (key.endsWith('.qty')) {
            const parsed = parseInt(cleanVal, 10);
            doc.setIn(path, isNaN(parsed) ? cleanVal : parsed);
          } else if (key.endsWith('.rate') || key.endsWith('gst_rate')) {
            const parsedDoc = YAML.parse(yamlText);
            const currencySymbol = parsedDoc?.metadata?.currency || '₹';
            const parsed = parseFloat(cleanVal.replace(new RegExp(`[${currencySymbol},\\s]`, 'g'), '').trim());
            doc.setIn(path, isNaN(parsed) ? cleanVal : parsed);
          } else {
            doc.setIn(path, cleanVal);
          }
          setYamlText(doc.toString());
        } catch (e) {}
      } else if (msg.type === 'QUOTE_FIELD_CLICK') {
        setActiveKey(msg.key);
        scrollYamlToKey(msg.key, false);
      } else if (msg.type === 'QUOTE_SELECTION') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection({ text: msg.text, rect: msg.rect, states: msg.states });
        }, 100);
      } else if (msg.type === 'QUOTE_SELECTION_CLEAR') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection(null);
        }, 100);
      } else if (msg.type === 'QUOTE_ITEM_ADD') {
        try {
          const doc = YAML.parseDocument(yamlText);
          let items = doc.get('items') as any;
          if (!items || !items.items) {
            doc.set('items', doc.createNode([]));
            items = doc.get('items');
          }
          if (items && items.items) {
            items.add(doc.createNode({
              num: String(items.items.length + 1).padStart(2, '0'),
              name: 'New Phase / Item',
              desc: 'Enter description of item',
              qty: 1,
              rate: 0
            }));
            lastChangeSource.current = 'iframe';
            setYamlText(doc.toString());
          }
        } catch (e) {}
      } else if (msg.type === 'QUOTE_ITEM_DELETE') {
        try {
          const doc = YAML.parseDocument(yamlText);
          const items = doc.get('items') as any;
          if (items && items.items && items.items.length > msg.index) {
            items.delete(msg.index);
            // Re-number
            for (let i = 0; i < items.items.length; i++) {
              const itemNode = items.get(i) as any;
              if (itemNode) itemNode.set('num', String(i + 1).padStart(2, '0'));
            }
            lastChangeSource.current = 'iframe';
            setYamlText(doc.toString());
          }
        } catch (e) {}
      } else if (msg.type === 'QUOTE_ITEM_INSERT') {
        try {
          const doc = YAML.parseDocument(yamlText);
          let items = doc.get('items') as any;
          if (!items || !items.items) {
            doc.set('items', doc.createNode([]));
            items = doc.get('items');
          }
          if (items && items.items) {
            const newNode = doc.createNode({
              num: String(msg.index + 2).padStart(2, '0'),
              name: 'New Phase / Item',
              desc: 'Enter description of item',
              qty: 1,
              rate: 0
            });
            items.items.splice(msg.index + 1, 0, newNode);
            // Re-number
            for (let i = 0; i < items.items.length; i++) {
              const itemNode = items.get(i) as any;
              if (itemNode) itemNode.set('num', String(i + 1).padStart(2, '0'));
            }
            lastChangeSource.current = 'iframe';
            setYamlText(doc.toString());
          }
        } catch (e) {}
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

  const openEditModal = (q: Quote) => {
    try {
      const parsed = YAML.parse(q.content);
      const metadata = parsed.metadata || {};
      const preparedFor = parsed.cover?.prepared_for || {};
      setDocModal({
        visible: true,
        mode: 'edit',
        quote: q,
        shortTitle: metadata.short_title || 'AI PM QUOTE',
        companyName: preparedFor.company_name || '',
        lead: preparedFor.lead || '',
        email: preparedFor.email || '',
        phone: preparedFor.phone || '',
        currency: metadata.currency || '₹',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNew = () => {
    setDocModal({
      visible: true,
      mode: 'create',
      shortTitle: 'AI PM QUOTE',
      companyName: 'Example Company Inc.',
      lead: 'Sarah Jenkins · Chief Information Officer',
      email: 'sarah.jenkins@example.com',
      phone: '+1 (555) 902-3481',
      currency: '₹',
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
          newId = `QT-2026-${rand}`;
          isUnique = !quotes.some(q => q.quoteId === newId);
        }

        const doc = YAML.parseDocument(yamlSource);
        doc.setIn(['metadata', 'quote_id'], newId);
        doc.setIn(['metadata', 'version'], '1.0');
        doc.setIn(['metadata', 'short_title'], docModal.shortTitle);
        doc.setIn(['metadata', 'currency'], docModal.currency);
        doc.setIn(['metadata', 'date'], new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }));
        doc.setIn(['metadata', 'validity'], new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        }));
        doc.setIn(['cover', 'prepared_for', 'company_name'], docModal.companyName);
        doc.setIn(['cover', 'prepared_for', 'lead'], docModal.lead);
        doc.setIn(['cover', 'prepared_for', 'email'], docModal.email);
        doc.setIn(['cover', 'prepared_for', 'phone'], docModal.phone);

        if (companyProfile) {
          doc.setIn(['cover', 'prepared_by', 'company_name'], companyProfile.companyName);
          doc.setIn(['cover', 'prepared_by', 'tagline'], companyProfile.companyTagline);
          doc.setIn(['cover', 'prepared_by', 'lead'], `${companyProfile.companyName} Team`);
          doc.setIn(['cover', 'prepared_by', 'email'], companyProfile.email);
          doc.setIn(['cover', 'prepared_by', 'phone'], companyProfile.phone);
          doc.setIn(['cover', 'prepared_by', 'address'], companyProfile.address);
          doc.setIn(['cover', 'prepared_by', 'website'], companyProfile.websiteUrl);
          doc.setIn(['cover', 'prepared_by', 'cin'], companyProfile.cin);
          doc.setIn(['cover', 'prepared_by', 'pan'], companyProfile.pan);
          doc.setIn(['cover', 'prepared_by', 'gst'], companyProfile.gstin);
        }

        const newYaml = doc.toString();
        const newQuote: Quote = {
          id: '',
          workspaceId,
          quoteId: newId,
          version: '1.0',
          title: docModal.shortTitle || 'Commercial Quotation',
          preparedFor: docModal.companyName || 'Example Client',
          preparedDate: new Date().toISOString(),
          content: newYaml,
          status: 'Pending Approval'
        };

        setActiveQuote(newQuote);
        lastChangeSource.current = null;
        setYamlText(newYaml);
        setSearchParams({ id: newId, v: '1.0' });
        setDocModal(prev => ({ ...prev, visible: false }));
        toast('Quote draft created!');
      } else {
        const target = docModal.quote;
        if (!target) return;

        const doc = YAML.parseDocument(target.content);
        doc.setIn(['metadata', 'short_title'], docModal.shortTitle);
        doc.setIn(['metadata', 'currency'], docModal.currency);
        doc.setIn(['cover', 'prepared_for', 'company_name'], docModal.companyName);
        doc.setIn(['cover', 'prepared_for', 'lead'], docModal.lead);
        doc.setIn(['cover', 'prepared_for', 'email'], docModal.email);
        doc.setIn(['cover', 'prepared_for', 'phone'], docModal.phone);

        const newYaml = doc.toString();
        await handleSave(undefined, target, newYaml);
        setDocModal(prev => ({ ...prev, visible: false }));
      }
    } catch (e: any) {
      toast(`Error processing: ${e.message}`);
    }
  };

  const handleBumpVersion = (base: Quote | null) => {
    if (!base) return;
    try {
      const doc = YAML.parseDocument(base.content);
      const currentVer = parseFloat(base.version);
      const newVer = (isNaN(currentVer) ? 1.0 : currentVer + 0.1).toFixed(1);

      doc.setIn(['metadata', 'version'], newVer);
      doc.setIn(['metadata', 'date'], new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }));

      const newYaml = doc.toString();
      const updated: Quote = {
        id: '',
        workspaceId,
        quoteId: base.quoteId,
        version: newVer,
        title: base.title,
        preparedFor: base.preparedFor,
        preparedDate: new Date().toISOString(),
        content: newYaml,
        status: base.status
      };

      setActiveQuote(updated);
      lastChangeSource.current = null;
      setYamlText(newYaml);
      setSearchParams({ id: base.quoteId, v: newVer });
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectProposal = (proposalId: string) => {
    try {
      const doc = YAML.parseDocument(yamlText);
      doc.setIn(['metadata', 'proposal_id'], proposalId || "[Select Connected Proposal]");
      
      const selected = proposals.find(p => p.proposalId === proposalId);
      if (selected) {
        try {
          const propData = YAML.parse(selected.content);
          if (propData?.cover?.prepared_for?.company_name) {
            doc.setIn(['cover', 'prepared_for', 'company_name'], propData.cover.prepared_for.company_name);
          }
          if (propData?.cover?.prepared_for?.lead) {
            doc.setIn(['cover', 'prepared_for', 'lead'], propData.cover.prepared_for.lead);
          }
          if (propData?.cover?.subtitle) {
            doc.setIn(['project_summary'], propData.cover.subtitle);
          }
        } catch(e){}
      }
      
      setYamlText(doc.toString());
      toast(`Connected to Proposal: ${proposalId || 'none'}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (forceWithOtp?: string, quoteOverride?: Quote, yamlOverride?: string) => {
    // If we have pendingSaveData from OTP modal and forceWithOtp is provided, use it directly
    if (forceWithOtp && otpModal.pendingSaveData) {
      try {
        const saveData = {
          ...otpModal.pendingSaveData,
          otpCode: forceWithOtp
        };
        const res = await fetch(`/api/workspaces/${workspaceId}/quotes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData),
        });

        if (res.ok) {
          const saved = await res.json();
          setOtpModal({ visible: false, purpose: 'EditQuote' });
          setOtpCode('');
          setOtpError('');
          await fetchQuotes();
          loadQuote(saved);
          toast('Quote saved successfully!');
        } else {
          const err = await res.text();
          setOtpError(err);
        }
      } catch (e: any) {
        toast(e.message);
      }
      return;
    }

    const targetQuote = quoteOverride || activeQuote;
    const targetYaml = yamlOverride || yamlText;
    if (!targetQuote || !targetYaml) return;
    try {
      let parsed: any = {};
      try {
        parsed = YAML.parse(targetYaml);
      } catch (err) {
        toast('Invalid YAML syntax.');
        return;
      }

      const quoteId = parsed.metadata?.quote_id || targetQuote.quoteId;
      const version = parsed.metadata?.version || targetQuote.version;
      const title = parsed.metadata?.short_title || targetQuote.title;
      const preparedFor = parsed.cover?.prepared_for?.company_name || targetQuote.preparedFor;
      const status = parsed.metadata?.status || targetQuote.status;
      const proposalIdConnect = parsed.metadata?.proposal_id === "[Select Connected Proposal]" ? undefined : parsed.metadata?.proposal_id;

      const saveData = {
        quoteId,
        version,
        title,
        preparedFor,
        preparedDate: new Date().toISOString(),
        content: targetYaml,
        status,
        proposalIdConnect,
        otpCode: forceWithOtp
      };

      const exists = quotes.some(q => q.quoteId === quoteId && q.version === version);
      const existingDoc = quotes.find(q => q.quoteId === quoteId && q.version === version);
      let isMetadataOnly = false;
      if (existingDoc) {
        try {
          const oldDoc = YAML.parse(existingDoc.content);
          const newDoc = YAML.parse(targetYaml);
          const oldClean = JSON.parse(JSON.stringify(oldDoc || {}));
          const newClean = JSON.parse(JSON.stringify(newDoc || {}));
          if (oldClean.metadata) {
            delete oldClean.metadata.status;
          }
          if (newClean.metadata) {
            delete newClean.metadata.status;
          }
          isMetadataOnly = JSON.stringify(oldClean) === JSON.stringify(newClean);
        } catch (e) {}
      }

      if (exists && !forceWithOtp && !isMetadataOnly) {
        triggerSendOtp('EditQuote', saveData);
        return;
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        const saved = await res.json();
        setOtpModal({ visible: false, purpose: 'EditQuote' });
        setOtpCode('');
        setOtpError('');
        await fetchQuotes();
        loadQuote(saved);
        toast('Quote saved successfully!');
      } else {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      toast(e.message);
    }
  };

  const handleDelete = async (forceWithOtp?: string) => {
    if (!activeQuote || !activeQuote.id) return;
    if (!forceWithOtp) {
      triggerSendOtp('DeleteQuote');
      return;
    }
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/quotes/${activeQuote.quoteId}/${activeQuote.version}?otpCode=${forceWithOtp}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setOtpModal({ visible: false, purpose: 'DeleteQuote' });
        setOtpCode('');
        setOtpError('');
        setActiveQuote(null);
        setYamlText('');
        await fetchQuotes();
        toast('Quote deleted successfully.');
      } else {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      toast(e.message);
    }
  };

  const triggerSendOtp = async (purpose: 'EditQuote' | 'DeleteQuote', pending?: any) => {
    setOtpModal({ visible: true, purpose, pendingSaveData: pending });
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/quotes/otp`, {
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

  const handleExportPdf = async () => {
    if (!iframeRef.current) return;
    try {
      toast('Compiling Quote PDF...');
      const html = iframeRef.current.contentWindow?.document.documentElement.outerHTML || '';
      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/quotes/pdf', { html }, setDownloadProgress);
      const filename = `${activeQuote?.quoteId || 'quote'}_v${activeQuote?.version || '1.0'}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Quote PDF will be downloaded...');
    } catch (e: any) {
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const downloadQuotePdf = async (quote: Quote) => {
    try {
      toast('Compiling Quote PDF...');
      let rawTemplate = templateHtml;
      if (!rawTemplate) {
        try {
          const templateRes = await fetch('/quotation_template.html');
          if (templateRes.ok) {
            const templateTxt = await templateRes.text();
            if (templateTxt && (templateTxt.includes('content-wrapper') || templateTxt.includes('header-container'))) {
              rawTemplate = templateTxt;
            }
          }
        } catch (e) {}
      }

      if (!rawTemplate) {
        throw new Error('Quote template HTML could not be loaded.');
      }

      const data = YAML.parse(quote.content);
      let rendered = injectQuoteData(rawTemplate, data, companyProfile);
      
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

      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/quotes/pdf', { html: rendered }, setDownloadProgress);
      const filename = `${quote.quoteId || 'quote'}_v${quote.version || '1.0'}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Quote PDF will be downloaded...');
    } catch (e: any) {
      console.error(e);
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };


  const handleExportYaml = () => {
    if (!yamlText) return;
    const blob = new Blob([yamlText], { type: 'application/x-yaml' });
    const filename = `${activeQuote?.quoteId || 'quote'}.yaml`;
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
        const cover = parsed?.cover || {};
        
        const quoteId = metadata.quote_id || `QT-2026-IMP-${Math.floor(100000 + Math.random() * 900000)}`;
        const version = metadata.version || '1.0';
        const title = metadata.short_title || 'Imported Quote';
        const preparedFor = cover.prepared_for?.company_name || 'Example Client';
        
        const importedQuote: Quote = {
          id: '',
          workspaceId,
          quoteId,
          version,
          title,
          preparedFor,
          preparedDate: new Date().toISOString(),
          content: text,
          status: metadata.status || 'Pending Approval',
          proposalIdConnect: metadata.proposal_id === "[Select Connected Proposal]" ? undefined : metadata.proposal_id
        };

        setActiveQuote(importedQuote);
        lastChangeSource.current = null;
        setYamlText(text);
        toast('YAML file imported successfully!');
      } catch (err: any) {
        toast(`Failed to parse YAML: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const activeQuoteProposalId = useMemo(() => {
    if (!yamlText) return '';
    try {
      const parsed = YAML.parse(yamlText);
      return parsed.metadata?.proposal_id || '';
    } catch (e) {
      return '';
    }
  }, [yamlText]);

  return (
    <div className={styles.container}>
      {/* 2. Main Edit/Preview Pane */}
      <div className={styles.mainContent}>
        {/* Top Header Actions */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {activeQuote ? (
              <div className={styles.breadcrumbActiveDoc}>
                <button
                  className={styles.btn}
                  style={{ border: 'none', padding: '2px 6px', background: 'transparent', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500 }}
                  onClick={() => {
                    setActiveQuote(null);
                    setSearchParams({});
                  }}
                >
                  ← Dashboard
                </button>
                <div className={styles.breadcrumbSeparator}>/</div>
                <span className={styles.activeDocId}>{activeQuote.quoteId}</span>
                <div className={styles.breadcrumbSeparator}>/</div>
                <span className={styles.activeDocTitle} title={activeQuote.title}>{activeQuote.title}</span>

                {/* Connected Proposal Link Selector */}
                <select
                  value={activeQuoteProposalId}
                  onChange={e => handleConnectProposal(e.target.value)}
                  className={styles.headerSelect}
                  style={{ marginLeft: '16px' }}
                >
                  <option value="">-- Connect to Proposal --</option>
                  {proposals.map(p => (
                    <option key={p.id} value={p.proposalId}>
                      {p.proposalId} - {p.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className={styles.activeDocId} style={{ fontSize: '14px', fontWeight: 600 }}>Quotes Dashboard</span>
            )}

            {/* Direct YAML upload button */}
            <button 
              className={styles.plusBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Import YAML File"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <polyline points="9 14 12 17 15 14"></polyline>
              </svg>
            </button>
          </div>
          <div className={styles.headerActions}>
            {activeQuote && (
              <>
                {/* Status Dropdown Button (Left to Export PDF) */}
                <div className={styles.actionsMenuWrapper} ref={statusDropdownRef} style={{ position: 'relative' }}>
                  <button
                    className={styles.btn}
                    onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${STATUS_OPTIONS.find(s => s.value.toLowerCase() === currentStatus.toLowerCase())?.border || 'rgba(0,0,0,0.1)'}`,
                      background: STATUS_OPTIONS.find(s => s.value.toLowerCase() === currentStatus.toLowerCase())?.bg || 'var(--affine-background-secondary-color)',
                      color: STATUS_OPTIONS.find(s => s.value.toLowerCase() === currentStatus.toLowerCase())?.color || 'var(--affine-text-primary-color)',
                    }}
                    title="Change Quote Status"
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: STATUS_OPTIONS.find(s => s.value.toLowerCase() === currentStatus.toLowerCase())?.color || '#D97706',
                        display: 'inline-block',
                      }}
                    />
                    <span>{currentStatus}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {statusMenuOpen && (
                    <div className={styles.dropdownMenu} style={{ left: 0, right: 'auto', minWidth: '170px', zIndex: 100 }}>
                      <div style={{ padding: '6px 10px 4px', fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--affine-text-secondary-color)' }}>
                        Set Status
                      </div>
                      {STATUS_OPTIONS.map(opt => {
                        const isSelected = currentStatus.toLowerCase() === opt.value.toLowerCase();
                        return (
                          <button
                            key={opt.value}
                            className={styles.dropdownItem}
                            onClick={() => handleStatusChange(opt.value)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              fontWeight: isSelected ? 600 : 400,
                              background: isSelected ? 'var(--affine-hover-color)' : 'transparent',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                              <span
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  backgroundColor: opt.color,
                                  display: 'inline-block',
                                }}
                              />
                              <span style={{ color: isSelected ? opt.color : 'inherit' }}>{opt.label}</span>
                            </span>
                            {isSelected && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={opt.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button className={styles.btn} onClick={handleExportPdf}>
                  Export PDF
                </button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleSave()}>
                  Save Quote
                </button>

                {/* More Actions dropdown menu */}
                <div className={styles.actionsMenuWrapper} ref={actionsDropdownRef}>
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                    title="More Actions"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  </button>
                  {actionsMenuOpen && (
                    <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto' }}>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          handleExportYaml();
                          setActionsMenuOpen(false);
                        }}
                        disabled={!yamlText}
                      >
                        <span>Export YAML</span>
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          fileInputRef.current?.click();
                          setActionsMenuOpen(false);
                        }}
                      >
                        <span>Import YAML</span>
                      </button>
                      {activeQuote?.id && (
                        <button
                          className={styles.dropdownItem}
                          style={{ color: '#2563eb', fontWeight: 600 }}
                          onClick={async () => {
                            setActionsMenuOpen(false);
                            try {
                              const res = await fetch(`/api/workspaces/${workspaceId}/brightloop/quotations/${activeQuote.id}/convert`, {
                                method: 'POST',
                              });
                              if (res.ok) {
                                toast('Quotation converted into Active Subscription successfully!');
                              } else {
                                toast('Quotation processed for subscription conversion.');
                              }
                            } catch {
                              toast('Error converting quotation.');
                            }
                          }}
                        >
                          <span>Convert to Subscription</span>
                        </button>
                      )}
                      {activeQuote?.id && (
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => {
                            handleDelete();
                            setActionsMenuOpen(false);
                          }}
                        >
                          <span>Delete Quote</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {activeQuote ? (
          /* Split Editor */
          <div ref={splitPaneRef} className={styles.splitPane}>
            {/* Iframe preview */}
            <div className={styles.previewPane} style={{ flex: `0 0 ${splitPercent}%`, width: `${splitPercent}%`, minWidth: 0, position: 'relative' }}>
              {iframeSrcDoc ? (
                <iframe
                  ref={iframeRef}
                  className={styles.iframe}
                  srcDoc={iframeSrcDoc}
                  title="Quote Render Preview"
                  style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
                />
              ) : (
                <div style={{ color: '#71717a' }}>No quote loaded or template empty.</div>
              )}
              {/* Iframe overlay when OTP modal is open - iframe CSS can't be blurred from parent */}
              {otpModal.visible && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  zIndex: 99999,
                  borderRadius: '12px',
                }} />
              )}
            </div>

            {/* Resize Handle Divider */}
            <div 
              className={styles.resizeHandle}
              onMouseDown={startResize}
              style={{
                width: '8px',
                cursor: 'col-resize',
                backgroundColor: isResizing ? '#3b82f6' : '#e4e4e7',
                borderLeft: '1px solid #d4d4d8',
                borderRight: '1px solid #d4d4d8',
                transition: 'background-color 0.2s',
                zIndex: 20,
              }}
            />

            {/* YAML Raw editor */}
            <div className={styles.editorPane} style={{ flex: `0 0 ${100 - splitPercent}%`, width: `${100 - splitPercent}%` }}>
              <div className={styles.editorHeader}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.editorTitle}>STRUCTURE VIEW (YAML)</div>
                  {activeKey && (
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500 }}>
                      Active: {activeKey}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Save manually to apply changes</div>
              </div>
              <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden', backgroundColor: '#18181b' }}>
                {/* Visual Line Highlight behind the text */}
                {activeLineIdx !== -1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${16 + (activeLineIdx * 18) - scrollTop}px`,
                      height: '18px',
                      backgroundColor: 'rgba(37, 99, 235, 0.15)', // Subtle blue highlight
                      borderLeft: '3px solid #2563eb', // Left visual edge marker
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                )}
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={yamlText}
                  onChange={(e) => {
                    lastChangeSource.current = 'editor';
                    setYamlText(e.target.value);
                  }}
                  onScroll={(e) => {
                    setScrollTop(e.currentTarget.scrollTop);
                  }}
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
                    transition: 'box-shadow 0.3s ease',
                    boxShadow: yamlFlash ? '0 0 0 2px rgba(251, 191, 36, 0.5)' : undefined,
                  }}
                  placeholder="# YAML quote content goes here..."
                />
              </div>
            </div>
          </div>
        ) : (
          /* Quotes Dashboard */
          <div className={styles.dashboardContainer}>
            <div className={styles.dashboardHeader}>
              <div>
                <h1 className={styles.dashboardTitle}>Project Quotes</h1>
                <p className={styles.dashboardSubtitle}>
                  Create, manage, and draft commercial quotes with connected proposals.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Dashboard Search Input */}
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
                    placeholder="Search quotes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleCreateNew}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>New Quote</span>
                </button>
              </div>
            </div>

            <div className={styles.dashboardCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Quote ID</th>
                    <th>Title</th>
                    <th>Prepared For</th>
                    <th>Connected Proposal</th>
                    <th style={{ width: '120px' }}>Date</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getGroupedQuotes().map((group) => {
                    return (
                      <React.Fragment key={group.quoteId}>
                        <tr 
                          className={styles.tableRow}
                          onClick={() => loadQuote(group.versions[0])}
                        >
                          <td>
                            <span style={{ fontWeight: 600, display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.quoteId}>
                              {group.quoteId}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.title}>
                              {group.title}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.preparedFor}>
                              {group.preparedFor}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.versions[0].proposalIdConnect || 'None'}>
                              {group.versions[0].proposalIdConnect || 'None'}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={new Date(group.latestDate).toLocaleDateString()}>
                              {new Date(group.latestDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                className={styles.tableActionBtn}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                onClick={() => openEditModal(group.versions[0])}
                                title="Edit Info"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className={styles.tableActionBtn}
                                onClick={() => loadQuote(group.versions[0])}
                              >
                                Open
                              </button>
                              <button
                                className={styles.tableActionBtn}
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                onClick={() => {
                                  downloadQuotePdf(group.versions[0]);
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
                      </React.Fragment>
                    );
                  })}
                  {getGroupedQuotes().length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#71717a' }}>
                        No quotes found. Click "New Quote" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for YAML imports */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".yaml,.yml"
        onChange={handleImportYaml}
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
        onCancel={() => setOtpModal({ visible: false, purpose: 'EditQuote' })}
        onConfirm={(code) => {
          if (otpModal.purpose === 'EditQuote') {
            handleSave(code);
          } else {
            handleDelete(code);
          }
        }}
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

      <QuoteModal
        docModal={docModal}
        setDocModal={setDocModal}
        onSubmit={submitDocModal}
      />
    </div>
  );
};
export default Component;
