import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useService, useLiveData } from '@toeverything/infra';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { AuthService } from '@affine/core/modules/cloud';
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
import { CurrencyDropdown } from '../documents-shared/currency-dropdown';
import { CloseIconSvg, TablerRepeatIcon } from './components/icons';
import { OtpModal } from './components/otp-modal';
import { InvoiceModal } from './components/invoice-modal';
import {
  useCompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  resolveCompanyLogo,
  getCompanyFieldStaticVal,
  updateCompanyProfileInHtmlDom,
  type CompanyProfile,
} from '../documents-shared/use-company-profile';

interface Invoice {
  id: string;
  workspaceId: string;
  invoiceId: string;
  version: string;
  title: string;
  preparedFor: string;
  preparedDate: string;
  content: string;
  status: string;
  quoteIdConnect?: string;
  proposalIdConnect?: string;
  isRecurring?: boolean;
  isRecurringParent?: boolean;
  parentInvoiceId?: string;
  recurringFrequency?: string;
  recurringStartDate?: string;
  recurringNextDate?: string;
  recurringCreatorId?: string;
  recurringRecipient?: string;
  recurringCc?: string;
}

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

function isDueDatePassed(dueDateStr?: string | null): boolean {
  if (!dueDateStr || typeof dueDateStr !== 'string') return false;
  const trimmed = dueDateStr.trim();
  if (!trimmed) return false;

  const dueInMatch = trimmed.match(/due\s+in\s+(\d+)\s+days?/i);
  if (dueInMatch) {
    const days = parseInt(dueInMatch[1], 10);
    return days < 0;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return false;
  }

  parsed.setHours(23, 59, 59, 999);
  return parsed.getTime() < Date.now();
}

function injectInvoiceData(
  templateHtml: string,
  dataObj: any,
  companyProfile?: CompanyProfile,
  isReadOnly?: boolean,
  isMasterTemplate?: boolean
): string {
  if (!templateHtml) return '';

  const cleanTemplate = templateHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const cp = companyProfile || DEFAULT_COMPANY_PROFILE;
  let rendered = updateCompanyProfileInHtmlDom(cleanTemplate, cp);

  const items = dataObj.items || [];
  let subtotal = 0;
  items.forEach((item: any) => {
    const qty = parseFloat(item.qty || item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    subtotal += qty * rate;
  });

  const gstRate = parseFloat(dataObj.financials?.gst_rate) || 18;
  const gst = subtotal * (gstRate / 100);
  const total = subtotal + gst;

  let rawStatus = isMasterTemplate ? 'Template (Master)' : (dataObj.metadata?.status || 'Unpaid');
  const rawDueDate = dataObj.metadata?.due_date;
  if (!isMasterTemplate && rawStatus.toLowerCase() === 'overdue' && rawDueDate && !isDueDatePassed(rawDueDate)) {
    rawStatus = 'Unpaid';
  } else if (!isMasterTemplate && rawStatus.toLowerCase() === 'unpaid' && rawDueDate && isDueDatePassed(rawDueDate)) {
    rawStatus = 'Overdue';
  }
  const isPaid = !isMasterTemplate && rawStatus.toLowerCase() === 'paid';
  const isOverdue = !isMasterTemplate && rawStatus.toLowerCase() === 'overdue';
  const statusClass = isMasterTemplate ? 'template' : (isPaid ? 'paid' : (isOverdue ? 'overdue' : 'unpaid'));

  let amountPaid = 0;
  if (isPaid) {
    amountPaid = total;
  } else if (dataObj.payment?.amount_paid !== undefined) {
    amountPaid = parseFloat(dataObj.payment.amount_paid) || 0;
  }
  const amountDue = total - amountPaid;
  const finalLabel = amountDue <= 0 ? 'Balance Due' : 'Amount Due';

  const currencySymbol = dataObj.metadata?.currency || '₹';

  const subtotalStr = currencySymbol + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const gstStr = currencySymbol + gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` (GST ${gstRate}%)`;
  const totalStr = currencySymbol + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountPaidStr = currencySymbol + amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amountDueStr = currencySymbol + Math.max(0, amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const loopRegex = /\{\{#invoice\.items\}\}([\s\S]*?)\{\{\/invoice\.items\}\}/g;
  const loopMatch = loopRegex.exec(rendered);
  if (loopMatch) {
    const rowTemplate = loopMatch[1];
    let rowsHtml = '';
    const canEdit = !isReadOnly;
    items.forEach((item: any, idx: number) => {
      const qty = parseFloat(item.qty || item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      const rateStr = currencySymbol + rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amtStr = currencySymbol + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let row = rowTemplate;
      row = row.replace('<tr>', `<tr data-index="${idx}">`);
      row = row.replace('01', String(idx + 1).padStart(2, '0'));
      row = row.replace('{{title}}', `<div class="item-title ${canEdit ? 'editable-invoice-field' : ''}" data-key="items.${idx}.name" contenteditable="${canEdit}">${item.name || item.title || '[Enter Name]'}</div>`);
      row = row.replace('{{description}}', `<div class="item-desc ${canEdit ? 'editable-invoice-field' : ''}" data-key="items.${idx}.desc" contenteditable="${canEdit}">${item.desc || item.description || '[Enter Description]'}</div>`);
      row = row.replace('{{quantity}}', `<span class="${canEdit ? 'editable-invoice-field' : ''}" data-key="items.${idx}.qty" contenteditable="${canEdit}">${qty}</span>`);
      row = row.replace('{{rate}}', `<span class="${canEdit ? 'editable-invoice-field' : ''}" data-key="items.${idx}.rate" contenteditable="${canEdit}">${rateStr}</span>`);
      row = row.replace('{{amount}}', `<span class="amount-col">${amtStr}</span>`);

      if (canEdit) {
        row = row.replace('</tr>', `
          <td style="width: 60px; text-align: center;" class="table-action-btn-col">
            <button class="table-action-btn insert-btn" onclick="window.parent.postMessage({ type: 'QUOTE_ITEM_INSERT', index: ${idx} }, '*')">+</button>
            <button class="table-action-btn delete-btn" onclick="window.parent.postMessage({ type: 'QUOTE_ITEM_DELETE', index: ${idx} }, '*')">×</button>
          </td>
        </tr>`);
      } else {
        row = row.replace('</tr>', `
          <td style="display: none;" class="table-action-btn-col"></td>
        </tr>`);
      }

      rowsHtml += row;
    });

    if (rowsHtml === '') {
      rowsHtml = canEdit 
        ? '<tr><td colspan="6" style="text-align: center; color: #888;">No items added yet. Click "+ Add Item" below to start.</td></tr>'
        : '<tr><td colspan="6" style="text-align: center; color: #888;">No items configured.</td></tr>';
    }
    rendered = rendered.replace(loopRegex, rowsHtml);
  }

  // Parse conditional blocks
  const parseConditionalBlock = (text: string, key: string, condition: boolean) => {
    const regex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{\\/${key}\\}\\}`, 'g');
    return condition ? text.replace(regex, '$1') : text.replace(regex, '');
  };

  rendered = parseConditionalBlock(rendered, 'invoice.notes', !!dataObj.notes?.text || !!dataObj.invoice?.notes);
  rendered = parseConditionalBlock(rendered, 'invoice.paid_details', isPaid);

  const placeholdersMap: Record<string, { path?: string; staticVal?: string; fallback: string }> = {
    'invoice.date': { path: 'metadata.date', fallback: '[Invoice Date]' },
    'invoice.due_date': { path: 'metadata.due_date', fallback: '[Due Date]' },
    'invoice.status': { path: 'metadata.status', fallback: isMasterTemplate ? 'MASTER TEMPLATE' : 'UNPAID' },
    'client.company_name': { path: 'cover.prepared_for.company_name', fallback: '[Client Company Name]' },
    'client.contact_name': { path: 'cover.prepared_for.lead', fallback: '[Client Contact Name]' },
    'client.address': { path: 'cover.prepared_for.address', fallback: '[Client Address]' },
    'client.email': { path: 'cover.prepared_for.email', fallback: '[Client Email]' },
    'client.phone': { path: 'cover.prepared_for.phone', fallback: '[Client Phone]' },
    'client.gst': { path: 'cover.prepared_for.gst', fallback: '[Client GSTIN]' },
    'project.name': { path: 'metadata.short_title', fallback: '[Project Name]' },
    'project.id': { path: 'metadata.project_id', fallback: 'PROJ-INTOAI' },
    'proposal.reference': { path: 'metadata.proposal_id', fallback: 'None' },
    'quote.reference': { path: 'metadata.quote_id', fallback: 'None' },
    'invoice.generated_date': { path: 'metadata.date', fallback: '[Generated Date]' },
  };

  rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, keyStr) => {
    const key = keyStr.trim();
    if (key === 'invoice.subtotal') return `<span class="invoice-subtotal-value">${subtotalStr}</span>`;
    if (key === 'invoice.tax') return `<span class="invoice-tax-value">${gstStr}</span>`;
    if (key === 'invoice.total') return `<span class="invoice-total-value">${totalStr}</span>`;
    if (key === 'invoice.amount_paid') return `<span class="invoice-amount-paid-value">${amountPaidStr}</span>`;
    if (key === 'invoice.amount_due') return `<span class="invoice-amount-due-value">${amountDueStr}</span>`;
    if (key === 'invoice.final_label') return finalLabel;
    if (key === 'invoice.status_class') return statusClass;

    const companyStatic = getCompanyFieldStaticVal(key, cp, dataObj);
    if (companyStatic !== null) {
      return `<span class="locked-company-field" contenteditable="false" data-company-field="${key}">${companyStatic}</span>`;
    }

    if (key === 'invoice.number') {
      const invNo = dataObj.metadata?.invoice_id || '[Invoice ID]';
      return `<span class="locked-company-field" contenteditable="false">${invNo}</span>`;
    }

    const config = placeholdersMap[key];
    if (config) {
      if (config.staticVal !== undefined) {
        // Locked non-editable company profile field
        return `<span class="locked-company-field" contenteditable="false" data-company-field="${key}">${config.staticVal}</span>`;
      }
      if (config.path) {
        const path = config.path.split('.');
        let val = dataObj;
        for (const p of path) {
          if (val && typeof val === 'object') {
            val = val[p];
          } else {
            val = undefined;
            break;
          }
        }
        const valStr = val !== undefined && val !== null ? String(val).trim() : '';
        const isDefaultPlaceholder = valStr.includes('[Select') || valStr === '' || valStr.toLowerCase() === 'none';
        let displayVal = isDefaultPlaceholder ? config.fallback : parseInlineFormatting(valStr);
        if (isDefaultPlaceholder && (key.includes('reference') || key.includes('id') || key.includes('proposal') || key.includes('quote') || key === 'project.name')) {
          if (key !== 'invoice.number') {
            displayVal = 'NA';
          }
        }
        const canEditField = !isReadOnly;
        return `<span data-key="${config.path}" class="${canEditField ? 'editable-invoice-field' : 'read-only-invoice-field'}">${displayVal}</span>`;
      }
    }
    return match;
  });

  return updateCompanyProfileInHtmlDom(rendered, cp, dataObj);
}

function injectReceiptData(
  templateHtml: string,
  dataObj: any,
  companyProfile?: CompanyProfile
): string {
  if (!templateHtml) return '';

  const cleanTemplate = templateHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const cp = companyProfile || DEFAULT_COMPANY_PROFILE;
  let rendered = updateCompanyProfileInHtmlDom(cleanTemplate, cp, dataObj);

  const items = dataObj.items || [];
  let subtotal = 0;
  items.forEach((item: any) => {
    const qty = parseFloat(item.qty || item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    subtotal += qty * rate;
  });

  const gstRate = parseFloat(dataObj.financials?.gst_rate) || 18;
  const gst = subtotal * (gstRate / 100);
  const total = subtotal + gst;

  const statusClass = 'paid';
  const currencySymbol = dataObj.metadata?.currency || '₹';
  const totalStr = currencySymbol + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const notesText = dataObj.payment?.notes || dataObj.notes || "Thank you for your business. For any payment inquiries, please write to billing@intoai.ai.";
  const notesRegex = /\{\{#receipt\.notes\}\}([\s\S]*?)\{\{\/receipt\.notes\}\}/g;
  if (notesText) {
    rendered = rendered.replace(notesRegex, (_match, innerHtml) => {
      return innerHtml.replace('{{receipt.notes}}', `<span class="editable-invoice-field" data-key="payment.notes" contenteditable="true">${notesText}</span>`);
    });
  } else {
    rendered = rendered.replace(notesRegex, '');
  }

  const placeholdersMap: { [key: string]: { path: string, fallback: string } } = {
    'receipt.number': { path: 'payment.receipt_number', fallback: `REC-${dataObj.metadata?.invoice_id?.replace('INV-', '') || '2026-000'}` },
    'receipt.date': { path: 'payment.date', fallback: dataObj.metadata?.date || new Date().toLocaleDateString() },
    'receipt.status': { path: 'metadata.status', fallback: 'PAID' },
    'receipt.status_class': { path: 'metadata.status_class', fallback: 'paid' },
    'client.company_name': { path: 'cover.prepared_for.company_name', fallback: '[Client Company Name]' },
    'client.contact_name': { path: 'cover.prepared_for.lead', fallback: '[Client Contact Name]' },
    'client.address': { path: 'cover.prepared_for.address', fallback: '[Client Address]' },
    'client.email': { path: 'cover.prepared_for.email', fallback: '[Client Email]' },
    'client.phone': { path: 'cover.prepared_for.phone', fallback: '[Client Phone]' },
    'payment.date': { path: 'payment.date', fallback: dataObj.metadata?.date || new Date().toLocaleDateString() },
    'payment.method': { path: 'payment.method', fallback: 'Bank Transfer (NEFT/RTGS)' },
    'payment.transaction_id': { path: 'payment.transaction_id', fallback: 'TXN_' + Math.floor(1000000 + Math.random() * 9000000) },
    'payment.gateway_ref': { path: 'payment.gateway_ref', fallback: 'ICIC_RTGS_' + Math.floor(10000 + Math.random() * 90000) },
    'project.name': { path: 'metadata.short_title', fallback: '[Project Name]' },
    'project.id': { path: 'metadata.project_id', fallback: 'PROJ-INTOAI' },
    'proposal.reference': { path: 'metadata.proposal_id', fallback: 'None' },
    'quote.reference': { path: 'metadata.quote_id', fallback: 'None' },
    'invoice.reference': { path: 'metadata.invoice_id', fallback: '[Invoice ID]' },
    'receipt.generated_date': { path: 'payment.date', fallback: new Date().toLocaleString() },
  };

  rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, keyStr) => {
    const key = keyStr.trim();
    if (key === 'payment.amount') return `<span class="payment-amount-value">${totalStr}</span>`;
    if (key === 'receipt.status_class') return statusClass;

    const companyStatic = getCompanyFieldStaticVal(key, cp, dataObj);
    if (companyStatic !== null) {
      return `<span class="locked-company-field" contenteditable="false" data-company-field="${key}">${companyStatic}</span>`;
    }

    const config = placeholdersMap[key];
    if (config) {
      const path = config.path.split('.');
      let val = dataObj;
      for (const p of path) {
        if (val && typeof val === 'object') {
          val = val[p];
        } else {
          val = undefined;
          break;
        }
      }
      const valStr = val !== undefined && val !== null ? String(val).trim() : '';
      const isDefaultPlaceholder = valStr.includes('[Select') || valStr === '' || valStr.toLowerCase() === 'none';
      let displayVal = isDefaultPlaceholder ? config.fallback : parseInlineFormatting(valStr);
      if (isDefaultPlaceholder && (key.includes('reference') || key.includes('id') || key.includes('proposal') || key.includes('quote') || key === 'project.name')) {
        if (key !== 'invoice.number' && key !== 'invoice.reference') {
          displayVal = 'NA';
        }
      }
      if (key === 'receipt.number' || key === 'receipt.generated_date') {
        return `<span class="locked-company-field" contenteditable="false">${displayVal}</span>`;
      }
      return `<span data-key="${config.path}" class="editable-invoice-field">${displayVal}</span>`;
    }
    return match;
  });

  return updateCompanyProfileInHtmlDom(rendered, cp, dataObj);
}


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
footer .editable-invoice-field,
.footer-container .editable-invoice-field,
.page-footer .editable-invoice-field,
.footer-strip .editable-invoice-field,
.footer .editable-invoice-field {
  outline: none !important;
  background: transparent !important;
  cursor: default !important;
  pointer-events: none !important;
}
</style>
<script>
(function() {
// Make fields editable
document.querySelectorAll('.editable-invoice-field').forEach(function(el) {
  el.contentEditable = "true";
});

document.querySelectorAll('.locked-company-field').forEach(function(el) {
  el.contentEditable = "false";
});

document.querySelectorAll('footer *, .footer-container *, .page-footer *, .footer-strip *, .footer *').forEach(function(el) {
  el.removeAttribute('contenteditable');
  el.contentEditable = "false";
  el.classList.remove('editable-invoice-field');
  el.classList.add('locked-company-field');
});

// Broadcast edits back to parent window
document.addEventListener('input', (event) => {
  const target = event.target;
  if (target && target.hasAttribute('data-key')) {
    const key = target.getAttribute('data-key');
    const value = target.innerHTML;
    window.parent.postMessage({
      type: 'INVOICE_EDIT',
      key: key,
      value: value
    }, '*');
  }
});

document.addEventListener('click', function(event) {
  var target = event.target.closest('.editable-invoice-field');
  if (target && target.hasAttribute('data-key')) {
    var key = target.getAttribute('data-key');
    window.parent.postMessage({
      type: 'INVOICE_FIELD_CLICK',
      key: key
    }, '*');
  }
});

})();
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
        type: 'INVOICE_SELECTION',
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
      type: 'INVOICE_SELECTION_CLEAR'
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
      const editableField = parent.closest('.editable-invoice-field');
      if (editableField) {
        editableField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    document.dispatchEvent(new Event('selectionchange'));
  } else if (event.data?.type === 'UPDATE_FIELDS') {
    const data = event.data.data;
    
    // If the number of items changed, rebuild table rows in the DOM instead of reloading
    const renderedRows = document.querySelectorAll('tr[data-index]').length;
    const dataRows = (data.items || []).length;
    if (renderedRows !== dataRows) {
       const items = data.items || [];
       const tbody = document.querySelector('.invoice-table tbody');
       if (tbody) {
         let rowsHtml = '';
         const currencySymbol = data.metadata?.currency || '₹';
         items.forEach((item, idx) => {
           const qty = parseFloat(item.qty || item.quantity) || 0;
           const rate = parseFloat(item.rate) || 0;
           const amt = qty * rate;
           const rateStr = currencySymbol + rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
           const amtStr = currencySymbol + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
           
           rowsHtml += \`
             <tr data-index="\${idx}">
              <td class="item-num align-center">\${String(idx + 1).padStart(2, '0')}</td>
              <td class="col-desc">
                <div class="item-title editable-invoice-field" data-key="items.\${idx}.name" contenteditable="true">\${item.name || item.title || '[Enter Name]'}</div>
                <div class="item-desc editable-invoice-field" data-key="items.\${idx}.desc" contenteditable="true">\${item.desc || item.description || '[Enter Description]'}</div>
              </td>
              <td class="align-center"><span class="editable-invoice-field" data-key="items.\${idx}.qty" contenteditable="true">\${qty}</span></td>
              <td class="align-right"><span class="editable-invoice-field" data-key="items.\${idx}.rate" contenteditable="true">\${rateStr}</span></td>
              <td class="align-right amount-col">\${amtStr}</td>
              <td style="width: 60px; text-align: center;" class="table-action-btn-col">
                <button class="table-action-btn insert-btn" onclick="window.parent.postMessage({ type: 'QUOTE_ITEM_INSERT', index: \${idx} }, '*')">+</button>
                <button class="table-action-btn delete-btn" onclick="window.parent.postMessage({ type: 'QUOTE_ITEM_DELETE', index: \${idx} }, '*')">×</button>
              </td>
            </tr>
          \`;
        });
        if (items.length === 0) {
          rowsHtml = \`<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">No items added yet. Click "+ Add Item" below to start.</td></tr>\`;
        }
        tbody.innerHTML = rowsHtml;
      }
    }

    document.querySelectorAll('.editable-invoice-field').forEach(el => {
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
        if (cleanKey !== 'metadata.invoice_id' && cleanKey !== 'metadata.invoice_reference') {
          valStr = 'NA';
          isDefaultPlaceholder = false;
        }
      }

      let formattedVal = '';
      const currencySymbol = data.metadata?.currency || '₹';
      if (key.endsWith('.rate')) {
        const rateVal = parseFloat(valStr) || 0;
        formattedVal = currencySymbol + rateVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    // Recalculate invoice row amounts and totals
    const items = data.items || [];
    let subtotal = 0;
    const currencySymbol = data.metadata?.currency || '₹';
    items.forEach((item, idx) => {
      const qty = parseFloat(item.qty || item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      subtotal += amt;
      
      const row = document.querySelector(\`tr[data-index="\${idx}"]\`);
      if (row) {
        const amtCol = row.querySelector('.amount-col');
        if (amtCol) {
          const amtStr = currencySymbol + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          if (amtCol.innerHTML !== amtStr) amtCol.innerHTML = amtStr;
        }
      }
    });

    const gstRate = parseFloat(data.financials?.gst_rate) || 18;
    const gstAmount = subtotal * (gstRate / 100);
    const total = subtotal + gstAmount;

    let amountPaid = 0;
    const isPaid = (data.metadata?.status || '').toLowerCase() === 'paid';
    if (isPaid) {
      amountPaid = total;
    } else if (data.payment?.amount_paid !== undefined) {
      amountPaid = parseFloat(data.payment.amount_paid) || 0;
    }
    const amountDue = total - amountPaid;

    const subtotalEl = document.querySelector('.invoice-subtotal-value');
    if (subtotalEl) {
      const subtotalStr = currencySymbol + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (subtotalEl.innerHTML !== subtotalStr) subtotalEl.innerHTML = subtotalStr;
    }

    const gstEl = document.querySelector('.invoice-tax-value');
    if (gstEl) {
      const gstStr = currencySymbol + gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' (GST ' + gstRate + '%)';
      if (gstEl.innerHTML !== gstStr) gstEl.innerHTML = gstStr;
    }

    const totalEl = document.querySelector('.invoice-total-value');
    if (totalEl) {
      const totalStr = currencySymbol + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (totalEl.innerHTML !== totalStr) totalEl.innerHTML = totalStr;
    }

    const paidEl = document.querySelector('.invoice-amount-paid-value');
    if (paidEl) {
      const paidStr = currencySymbol + amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (paidEl.innerHTML !== paidStr) paidEl.innerHTML = paidStr;
    }

    const dueEl = document.querySelector('.invoice-amount-due-value');
    if (dueEl) {
      const dueStr = currencySymbol + Math.max(0, amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (dueEl.innerHTML !== dueStr) dueEl.innerHTML = dueStr;
    }

    const labelEl = document.querySelector('.invoice-final-label-value');
    if (labelEl) {
      const labelStr = amountDue <= 0 ? 'Balance Due' : 'Amount Due';
      if (labelEl.innerHTML !== labelStr) labelEl.innerHTML = labelStr;
    }

    const rAmountEl = document.querySelector('.payment-amount-value');
    if (rAmountEl) {
      const totalStr = currencySymbol + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (rAmountEl.innerHTML !== totalStr) rAmountEl.innerHTML = totalStr;
    }
  } else if (event.data?.type === 'HIGHLIGHT_FIELD') {
    const key = event.data.key;
    const el = document.querySelector(\`.editable-invoice-field[data-key="\${key}"]\`);
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

  const authSession = useService(AuthService).session;
  const authAccount = useLiveData(authSession.account$);
  const currentUserEmail = authAccount?.info?.companyMail || authAccount?.email || '';

  const workspaceMeta = currentWorkspace?.docCollection?.meta as any;
  const workspaceBillingTo = workspaceMeta?.billingMailTo || workspaceMeta?.companyMail || '';
  const workspaceBillingCc = workspaceMeta?.billingMailCc || '';

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [recurringNextDate, setRecurringNextDate] = useState('');
  const [recurringRecipient, setRecurringRecipient] = useState('');
  const [recurringCc, setRecurringCc] = useState('');
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);

  const calculateDefaultNextDate = (freq: string = 'monthly'): string => {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth();

    if (freq === 'monthly') {
      targetMonth += 1;
    } else if (freq === 'quarterly') {
      targetMonth += 3;
    } else if (freq === 'half_year') {
      targetMonth += 6;
    } else if (freq === 'year') {
      targetYear += 1;
    } else {
      targetMonth += 1;
    }

    if (targetMonth > 11) {
      targetYear += Math.floor(targetMonth / 12);
      targetMonth = targetMonth % 12;
    }

    const yyyy = targetYear;
    const mm = String(targetMonth + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  };

  const calculateNextRecurringDate = (fromDate: Date, freq: string = 'monthly'): Date => {
    const d = new Date(fromDate);
    if (freq === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (freq === 'quarterly') {
      d.setMonth(d.getMonth() + 3);
    } else if (freq === 'half_year') {
      d.setMonth(d.getMonth() + 6);
    } else if (freq === 'year') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d;
  };

  const [searchParams, setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  
  const [invoiceTemplateHtml, setInvoiceTemplateHtml] = useState<string>('');
  const [receiptTemplateHtml, setReceiptTemplateHtml] = useState<string>('');
  const [defaultYaml, setDefaultYaml] = useState<string>('');

  const [yamlText, setYamlText] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>('');
  const lastChangeSource = useRef<'editor' | 'iframe' | null>(null);

  const { setCopilotContext } = useWorkspaceCopilot();

  useEffect(() => {
    setCopilotContext((prev: WorkspaceCopilotContextState) => ({
      ...prev,
      activeTab: 'documents',
      activeDocId: activeInvoice ? `${activeInvoice.invoiceId}-v${activeInvoice.version}` : undefined,
      activeDocTitle: activeInvoice ? `${activeInvoice.title} (v${activeInvoice.version})` : undefined,
      activeDocContent: yamlText || (activeInvoice ? activeInvoice.content : ''),
    }));
  }, [activeInvoice, yamlText, setCopilotContext]);

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
          toast('Invoice updated by Workspace Copilot');
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

  const [scrollTop, setScrollTop] = useState(0);
  const activeLineIdx = useMemo(() => {
    if (!activeKey || !yamlText) return -1;
    return findLineIndexForPath(yamlText, activeKey);
  }, [activeKey, yamlText]);

  // View Mode: invoice or receipt preview inside the active view
  const [viewMode, setViewMode] = useState<'invoice' | 'receipt'>('invoice');
  // Dashboard tab selector
  const [dashboardTab, setDashboardTab] = useState<'invoices' | 'receipts'>('invoices');

  // OTP gated modals
  const [otpModal, setOtpModal] = useState<{
    visible: boolean;
    purpose: 'EditInvoice' | 'DeleteInvoice' | 'ChangeInvoiceStatus';
    pendingSaveData?: any;
  }>({
    visible: false,
    purpose: 'EditInvoice',
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');

  const toInputDateFormat = (dateStr?: string, defaultDaysOffset = 0): string => {
    if (!dateStr) {
      const target = new Date(Date.now() + defaultDaysOffset * 24 * 60 * 60 * 1000);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, '0');
      const dd = String(target.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return dateStr;
  };

  const formatDateToLocale = (dateStr?: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  };

  // Creation & edit popup modal state
  const [docModal, setDocModal] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    invoice?: Invoice;
    shortTitle: string;
    invoiceDate?: string;
    dueDate?: string;
    dueDays?: number;
    companyName: string;
    lead: string;
    address: string;
    email: string;
    phone: string;
    gst: string;
    currency: string;
    isRecurringMaster?: boolean;
  }>({
    visible: false,
    mode: 'create',
    shortTitle: 'AI PM INVOICE',
    invoiceDate: toInputDateFormat(),
    dueDate: toInputDateFormat(undefined, 20),
    dueDays: 20,
    companyName: 'Example Company Inc.',
    lead: 'Sarah Jenkins · Chief Information Officer',
    address: 'No.100 Pine Street, Suite 2400, San Francisco, CA 94111',
    email: 'sarah.jenkins@example.com',
    phone: '+1 (555) 902-3481',
    gst: '[Client GSTIN]',
    currency: '₹',
    isRecurringMaster: false,
  });

  const [pendingStatusChange, setPendingStatusChange] = useState<{
    invoice: Invoice;
    newStatus: string;
  } | null>(null);

  const [customChildModal, setCustomChildModal] = useState<{
    visible: boolean;
    masterInvoice: Invoice | null;
    customDate: string;
    sendEmail: boolean;
    isSubmitting: boolean;
  }>({
    visible: false,
    masterInvoice: null,
    customDate: toInputDateFormat(),
    sendEmail: true,
    isSubmitting: false,
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [yamlFlash, setYamlFlash] = useState(false);
  const yamlFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocs, setExpandedDocs] = useState<{ [key: string]: boolean }>({});

  const [isResizing, setIsResizing] = useState(false);
  const [splitPercent, setSplitPercent] = useState(60);
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

  // Dropdown states & refs
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  const versionDropdownRef = useRef<HTMLDivElement>(null);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  const getInvoiceDueDate = useCallback((inv?: Invoice | null): string => {
    if (!inv) return '-';
    const contentToUse = (activeInvoice && (activeInvoice.id === inv.id || activeInvoice.invoiceId === inv.invoiceId) && yamlText)
      ? yamlText
      : inv.content;

    if (!contentToUse) return '-';

    try {
      const parsed = YAML.parse(contentToUse);
      const meta = parsed?.metadata || {};
      if (meta.is_recurring_master || inv.isRecurringParent) {
        const dueDays = meta.due_days ?? 20;
        return `Due in ${dueDays} days`;
      }
      if (meta.due_date && String(meta.due_date).trim()) {
        return String(meta.due_date).trim();
      }
      if (meta.due_days) {
        return `Due in ${meta.due_days} days`;
      }
      if (meta.date) {
        return meta.date;
      }
    } catch (e) {}
    return '-';
  }, [activeInvoice, yamlText]);

  const getInvoiceEffectiveStatus = (inv: Invoice): string => {
    if (inv.isRecurringParent) return 'Template (Master)';
    const content = (activeInvoice && activeInvoice.invoiceId === inv.invoiceId && activeInvoice.version === inv.version)
      ? yamlText
      : inv.content;
    try {
      const parsed = YAML.parse(content);
      const metaStatus = parsed?.metadata?.status || inv.status || 'Unpaid';
      const rawDueDate = parsed?.metadata?.due_date;
      if (metaStatus.toLowerCase() === 'paid') return 'Paid';
      if (rawDueDate) {
        if (isDueDatePassed(rawDueDate)) return 'Overdue';
        return 'Unpaid';
      }
      return metaStatus;
    } catch (_) {
      return inv.status || 'Unpaid';
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

  const getGroupedInvoices = () => {
    const query = searchQuery.toLowerCase();

    // Map all sub-invoices by parentInvoiceId
    const subInvoicesByParent: { [parentId: string]: Invoice[] } = {};
    invoices.forEach(inv => {
      if (inv.parentInvoiceId) {
        if (!subInvoicesByParent[inv.parentInvoiceId]) {
          subInvoicesByParent[inv.parentInvoiceId] = [];
        }
        subInvoicesByParent[inv.parentInvoiceId].push(inv);
      }
    });

    // Sort sub-invoices for each parent by preparedDate descending
    Object.keys(subInvoicesByParent).forEach(parentId => {
      subInvoicesByParent[parentId].sort((a, b) => new Date(b.preparedDate).getTime() - new Date(a.preparedDate).getTime());
    });

    // Top-level invoices are those without a parentInvoiceId
    const topLevelInvoices = invoices.filter(inv => !inv.parentInvoiceId);

    const filtered = topLevelInvoices.filter(i => {
      const matchesMaster = (
        i.invoiceId.toLowerCase().includes(query) ||
        i.title.toLowerCase().includes(query) ||
        i.preparedFor.toLowerCase().includes(query)
      );
      if (matchesMaster) return true;

      // Also match if any of its sub-invoices match the search query
      const subs = subInvoicesByParent[i.invoiceId] || [];
      return subs.some(s =>
        s.invoiceId.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        s.preparedFor.toLowerCase().includes(query)
      );
    });

    const groups: { [key: string]: Invoice[] } = {};
    filtered.forEach(i => {
      if (!groups[i.invoiceId]) {
        groups[i.invoiceId] = [];
      }
      groups[i.invoiceId].push(i);
    });

    return Object.keys(groups).map(invoiceId => {
      const sorted = groups[invoiceId].sort((a, b) => {
        const vA = parseFloat(a.version) || 0;
        const vB = parseFloat(b.version) || 0;
        return vB - vA;
      });
      const latest = sorted[0];
      const subInvoices = subInvoicesByParent[invoiceId] || [];
      return {
        invoiceId,
        title: latest.title,
        preparedFor: latest.preparedFor,
        latestDate: latest.preparedDate,
        dueDate: getInvoiceDueDate(latest),
        versions: sorted,
        isRecurringParent: latest.isRecurringParent,
        subInvoices
      };
    }).sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  };

  const getGroupedReceipts = () => {
    // Deduplicate by invoiceId — show only the latest paid version per unique invoice.
    // This prevents duplicates when the same invoiceId/version was updated multiple times.
    const latestPaidByInvoiceId = new Map<string, { invoice: Invoice, data: any }>();

    invoices.forEach(inv => {
      try {
        const data = YAML.parse(inv.content);
        const isPaid = inv.status.toLowerCase() === 'paid' ||
                       data.metadata?.status?.toLowerCase() === 'paid' ||
                       data.metadata?.receipt_downloaded === true;
        if (isPaid) {
          const existing = latestPaidByInvoiceId.get(inv.invoiceId);
          if (!existing) {
            latestPaidByInvoiceId.set(inv.invoiceId, { invoice: inv, data });
          } else {
            // Keep the one with receipt_downloaded=true, or the latest version
            const existingDownloaded = existing.data.metadata?.receipt_downloaded === true;
            const thisDownloaded = data.metadata?.receipt_downloaded === true;
            if (!existingDownloaded && thisDownloaded) {
              latestPaidByInvoiceId.set(inv.invoiceId, { invoice: inv, data });
            } else if (existingDownloaded === thisDownloaded) {
              const vA = parseFloat(existing.invoice.version) || 0;
              const vB = parseFloat(inv.version) || 0;
              if (vB > vA) {
                latestPaidByInvoiceId.set(inv.invoiceId, { invoice: inv, data });
              }
            }
          }
        }
      } catch (e) {}
    });

    const receiptsList = Array.from(latestPaidByInvoiceId.values());

    const filtered = receiptsList.filter(item => {
      const query = searchQuery.toLowerCase();
      const recNumber = item.data.payment?.receipt_number || `REC-${item.invoice.invoiceId.replace('INV-', '')}`;
      return (
        recNumber.toLowerCase().includes(query) ||
        item.invoice.invoiceId.toLowerCase().includes(query) ||
        item.invoice.title.toLowerCase().includes(query) ||
        item.invoice.preparedFor.toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => new Date(b.invoice.preparedDate).getTime() - new Date(a.invoice.preparedDate).getTime());
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocs(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  // Load static templates and DB listings
  useEffect(() => {
    const loadStaticAssets = async () => {
      try {
        const invRes = await fetch('/invoice_template.html');
        const invTxt = await invRes.text();
        setInvoiceTemplateHtml(invTxt);

        const recRes = await fetch('/receipt_template.html');
        const recTxt = await recRes.text();
        setReceiptTemplateHtml(recTxt);

        const sampleRes = await fetch('/invoice_sample.yaml');
        const sampleTxt = await sampleRes.text();
        setDefaultYaml(sampleTxt);
      } catch (e) {
        console.error('Failed to load static assets', e);
      }
    };

    loadStaticAssets();
    fetchInvoices();
    fetchQuotes();
    fetchProposals();
  }, [workspaceId]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const loadInvoice = (invoice: Invoice, preferredMode?: 'invoice' | 'receipt') => {
    setActiveInvoice(invoice);
    setActiveKey(null);
    lastChangeSource.current = null;
    setYamlText(invoice.content);
    setExpandedDocs(prev => ({ ...prev, [invoice.invoiceId]: true }));
    setSearchParams({ id: invoice.invoiceId, v: invoice.version });
    if (preferredMode) {
      setViewMode(preferredMode);
    } else {
      setViewMode('invoice');
    }
    // Populate recurring configuration states
    const initialFreq = invoice.recurringFrequency ?? 'monthly';
    setIsRecurring(invoice.isRecurring ?? false);
    setRecurringFrequency(initialFreq);
    setRecurringNextDate(
      invoice.recurringNextDate 
        ? new Date(invoice.recurringNextDate).toISOString().split('T')[0] 
        : calculateDefaultNextDate(initialFreq)
    );
    setRecurringRecipient(invoice.recurringRecipient ?? '');
    setRecurringCc(invoice.recurringCc ?? '');
  };

  // Auto-resolve recipient and CC billing emails from workspace and profile.
  // Using refs to track last values so we can sync them automatically when they change in settings.
  const lastWorkspaceBillingTo = useRef(workspaceBillingTo);
  const lastCurrentUserEmail = useRef(currentUserEmail);
  
  useEffect(() => {
    if (activeInvoice) {
      if (!recurringRecipient || recurringRecipient === lastWorkspaceBillingTo.current) {
        setRecurringRecipient(workspaceBillingTo || activeInvoice.recurringRecipient || '');
      }
    }
    lastWorkspaceBillingTo.current = workspaceBillingTo;
  }, [activeInvoice, workspaceBillingTo]);

  const lastWorkspaceBillingCc = useRef(workspaceBillingCc);
  
  useEffect(() => {
    if (activeInvoice) {
      if (!recurringCc || recurringCc === lastWorkspaceBillingCc.current) {
        setRecurringCc(workspaceBillingCc || activeInvoice.recurringCc || '');
      }
    }
    lastWorkspaceBillingCc.current = workspaceBillingCc;
  }, [activeInvoice, workspaceBillingCc]);

  // 1. Sync search parameters
  useEffect(() => {
    const invId = searchParams.get('id');
    const invVer = searchParams.get('v');
    
    if (invId && invVer) {
      if (activeInvoice && activeInvoice.invoiceId === invId && activeInvoice.version === invVer) return;
      if (invoices.length > 0) {
        const match = invoices.find(i => i.invoiceId === invId && i.version === invVer);
        if (match) loadInvoice(match, viewMode);
      }
    } else {
      if (activeInvoice && !searchParams.get('action')) {
        setActiveInvoice(null);
        setYamlText('');
      }
    }
  }, [searchParams, invoices, activeInvoice]);

  // 2. Generate invoice from quote parameters if present
  useEffect(() => {
    const action = searchParams.get('action');
    const qId = searchParams.get('quoteId');
    const qVer = searchParams.get('v');

    if (action === 'new_from_quote' && qId && qVer && defaultYaml && invoiceTemplateHtml) {
      const generateFromQuote = async () => {
        try {
          const res = await fetch(`/api/workspaces/${workspaceId}/quotes/${qId}/${qVer}`);
          if (res.ok) {
            const quoteData = await res.json();
            const parsedQuote = YAML.parse(quoteData.content);
            let invoiceId = '';
            let isUnique = false;
            while (!isUnique) {
              const rand = Math.floor(100000 + Math.random() * 900000);
              invoiceId = `INV-2026-${rand}`;
              isUnique = !invoices.some(i => i.invoiceId === invoiceId);
            }

            const doc = YAML.parseDocument(quoteData.content);
            doc.setIn(['metadata', 'quote_id'], qId);
            doc.setIn(['metadata', 'invoice_id'], invoiceId);
             doc.deleteIn(['metadata', 'validity']);
             doc.deleteIn(['project_summary']);
             doc.deleteIn(['roadmap']);
             doc.deleteIn(['terms', 'title']);
             doc.setIn(['metadata', 'due_date'], new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
               year: 'numeric', month: 'long', day: 'numeric'
             }));
             doc.setIn(['metadata', 'short_title'], parsedQuote.metadata?.short_title?.replace('QUOTE', 'INVOICE') || 'AI PM INVOICE');
             doc.setIn(['metadata', 'status'], 'Unpaid');
              
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

                doc.setIn(['payment', 'bank_details', 'bank_name'], companyProfile.bankName || 'ICICI Bank');
                doc.setIn(['payment', 'bank_details', 'beneficiary'], companyProfile.bankAccountName || companyProfile.companyName);
                doc.setIn(['payment', 'bank_details', 'account_number'], companyProfile.bankAccountNumber || '');
                doc.setIn(['payment', 'bank_details', 'ifsc'], companyProfile.bankIfsc || '');

                const bName = companyProfile.bankName || 'Bank';
                const bAcc = companyProfile.bankAccountNumber || '';
                const bIfsc = companyProfile.bankIfsc || '';
                const bBeneficiary = companyProfile.bankAccountName || companyProfile.companyName;
                doc.setIn(['terms', 'text'], `Please remit payment via bank transfer to the following account: ${bBeneficiary}, ${bName}, A/C: ${bAcc}, IFSC: ${bIfsc}. Payments are due within 20 days of invoice issue date.`);
              }

            const newYaml = doc.toString();
            const newInvoice: Invoice = {
              id: '',
              workspaceId,
              invoiceId,
              version: '1.0',
              title: parsedQuote.metadata?.short_title?.replace('QUOTE', 'INVOICE') || 'AI PM INVOICE',
              preparedFor: parsedQuote.cover?.prepared_for?.company_name || 'Example Client',
              preparedDate: new Date().toISOString(),
              content: newYaml,
              status: 'Unpaid',
              quoteIdConnect: qId,
              proposalIdConnect: parsedQuote.metadata?.proposal_id === "[Select Connected Proposal]" ? undefined : parsedQuote.metadata?.proposal_id
            };

            setActiveInvoice(newInvoice);
            lastChangeSource.current = null;
            setYamlText(newYaml);
            setViewMode('invoice');
            setSearchParams({ id: invoiceId, v: '1.0' });
            toast('Generated new Invoice draft from Quote.');
          }
        } catch (e) {
          console.error(e);
        }
      };
      generateFromQuote();
    }
  }, [searchParams, defaultYaml, invoiceTemplateHtml, workspaceId]);

  // Load preview iframe when yamlText changes
  const lastLoadedInvoiceRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeInvoice) {
      lastLoadedInvoiceRef.current = null;
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
        } catch (e) {
          console.error("[Parent] Error posting message to iframe:", e);
        }
      } else {
        console.warn("[Parent] iframe contentWindow not available to post message");
      }
      return;
    }

    const invoiceKey = `${activeInvoice.invoiceId}_${activeInvoice.version}_${viewMode}`;
    try {
      const data = YAML.parse(yamlText);
      const currentTemplate = viewMode === 'invoice' ? invoiceTemplateHtml : receiptTemplateHtml;
      if (!currentTemplate) return;

      if (lastLoadedInvoiceRef.current !== invoiceKey) {
        lastLoadedInvoiceRef.current = invoiceKey;
        let rendered = viewMode === 'invoice'
          ? injectInvoiceData(currentTemplate, data, companyProfile)
          : injectReceiptData(currentTemplate, data, companyProfile);
        
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
  }, [yamlText, invoiceTemplateHtml, receiptTemplateHtml, activeInvoice, viewMode, companyProfile]);

  const invoiceData = useMemo(() => {
    try {
      return YAML.parse(yamlText);
    } catch (e) {
      return null;
    }
  }, [yamlText]);

  const isPaid = useMemo(() => {
    if (!invoiceData) return false;
    const status = invoiceData.metadata?.status || '';
    return status.toLowerCase() === 'paid';
  }, [invoiceData]);

  const isReceiptDownloaded = useMemo(() => {
    if (!invoiceData) return false;
    return invoiceData.metadata?.receipt_downloaded === true;
  }, [invoiceData]);

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

      if (msg.type === 'INVOICE_EDIT') {
        const { key, value } = msg;
        lastChangeSource.current = 'iframe';
        try {
          const doc = YAML.parseDocument(yamlText);
          const path = key.split('.').map((p: string) => /^\d+$/.test(p) ? parseInt(p, 10) : p);
          let cleanVal = htmlToMarkdown(value).trim();
          if (key.endsWith('.qty')) {
            const parsed = parseInt(cleanVal, 10);
            doc.setIn(path, isNaN(parsed) ? cleanVal : parsed);
          } else if (key.endsWith('.rate')) {
            const parsedDoc = YAML.parse(yamlText);
            const currencySymbol = parsedDoc?.metadata?.currency || '₹';
            const parsed = parseFloat(cleanVal.replace(new RegExp(`[${currencySymbol},\\s]`, 'g'), '').trim());
            doc.setIn(path, isNaN(parsed) ? cleanVal : parsed);
          } else {
            doc.setIn(path, cleanVal);
          }

          // If due date was edited, automatically check if status should flip between Overdue and Unpaid
          if (key === 'metadata.due_date') {
            const currentStatus = String(doc.getIn(['metadata', 'status']) || '').toLowerCase();
            if (currentStatus === 'overdue' && !isDueDatePassed(cleanVal)) {
              doc.setIn(['metadata', 'status'], 'Unpaid');
            } else if (currentStatus === 'unpaid' && isDueDatePassed(cleanVal)) {
              doc.setIn(['metadata', 'status'], 'Overdue');
            }
          }

          setYamlText(doc.toString());
        } catch (e) {}
      } else if (msg.type === 'INVOICE_FIELD_CLICK') {
        setActiveKey(msg.key);
        scrollYamlToKey(msg.key, false);
      } else if (msg.type === 'INVOICE_SELECTION') {
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
        selectionTimeoutRef.current = setTimeout(() => {
          setSelection({ text: msg.text, rect: msg.rect, states: msg.states });
        }, 100);
      } else if (msg.type === 'INVOICE_SELECTION_CLEAR') {
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
            const newItemNum = String(items.items.length + 1).padStart(2, '0');
            items.add(doc.createNode({
              num: newItemNum,
              name: 'New Phase / Item',
              desc: 'Enter description of item',
              qty: 1,
              rate: 0
            }));
            // Update dynamically without full reload
            lastChangeSource.current = 'iframe';
            setYamlText(doc.toString());
          } else {
            console.warn('[Invoice] Could not get items sequence node after creation');
          }
        } catch (e) { console.error('[Invoice] QUOTE_ITEM_ADD error:', e); }
      } else if (msg.type === 'QUOTE_ITEM_DELETE') {
        try {
          const doc = YAML.parseDocument(yamlText);
          const items = doc.get('items') as any;
          if (items && items.items && items.items.length > msg.index) {
            items.delete(msg.index);
            for (let i = 0; i < items.items.length; i++) {
              const itemNode = items.get(i) as any;
              if (itemNode) itemNode.set('num', String(i + 1).padStart(2, '0'));
            }
            // Update dynamically without full reload
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
            for (let i = 0; i < items.items.length; i++) {
              const itemNode = items.get(i) as any;
              if (itemNode) itemNode.set('num', String(i + 1).padStart(2, '0'));
            }
            // Update dynamically without full reload
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

  const openEditModal = (inv: Invoice) => {
    try {
      const parsed = YAML.parse(inv.content);
      const metadata = parsed.metadata || {};
      const preparedFor = parsed.cover?.prepared_for || {};
      const isMaster = Boolean(inv.isRecurringParent || metadata.is_recurring_master);
      const rawDueDays = metadata.due_days ?? 20;
      const parsedDueDays = parseInt(String(rawDueDays), 10) || 20;

      setDocModal({
        visible: true,
        mode: 'edit',
        invoice: inv,
        shortTitle: metadata.short_title || 'AI PM INVOICE',
        invoiceDate: toInputDateFormat(metadata.date),
        dueDate: toInputDateFormat(metadata.due_date, 20),
        dueDays: parsedDueDays,
        companyName: preparedFor.company_name || '',
        lead: preparedFor.lead || '',
        address: preparedFor.address || '',
        email: preparedFor.email || '',
        phone: preparedFor.phone || '',
        gst: preparedFor.gst || '',
        currency: metadata.currency || '₹',
        isRecurringMaster: isMaster,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNew = () => {
    setDocModal({
      visible: true,
      mode: 'create',
      shortTitle: 'AI PM INVOICE',
      invoiceDate: toInputDateFormat(),
      dueDate: toInputDateFormat(undefined, 20),
      dueDays: 20,
      companyName: 'Example Company Inc.',
      lead: 'Sarah Jenkins · Chief Information Officer',
      address: 'No.100 Pine Street, Suite 2400, San Francisco, CA 94111',
      email: 'sarah.jenkins@example.com',
      phone: '+1 (555) 902-3481',
      gst: '[Client GSTIN]',
      currency: '₹',
      isRecurringMaster: false,
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
          newId = `INV-2026-${rand}`;
          isUnique = !invoices.some(i => i.invoiceId === newId);
        }

        const isMaster = Boolean(docModal.isRecurringMaster);
        const dueDays = docModal.dueDays ?? 20;

        const doc = YAML.parseDocument(yamlSource);
        doc.setIn(['metadata', 'invoice_id'], newId);
        doc.setIn(['metadata', 'version'], '1.0');
        doc.setIn(['metadata', 'short_title'], docModal.shortTitle);
        doc.setIn(['metadata', 'currency'], docModal.currency);
        doc.setIn(['metadata', 'date'], formatDateToLocale(docModal.invoiceDate || toInputDateFormat()));
        
        if (isMaster) {
          doc.setIn(['metadata', 'due_days'], dueDays);
          doc.setIn(['metadata', 'due_date'], `Due in ${dueDays} days`);
          doc.setIn(['metadata', 'is_recurring_master'], true);
          doc.setIn(['metadata', 'status'], 'Master Template');
        } else {
          doc.setIn(['metadata', 'due_date'], formatDateToLocale(docModal.dueDate || toInputDateFormat(undefined, 20)));
        }
        
        doc.setIn(['cover', 'prepared_for', 'company_name'], docModal.companyName);
        doc.setIn(['cover', 'prepared_for', 'lead'], docModal.lead);
        doc.setIn(['cover', 'prepared_for', 'address'], docModal.address);
        doc.setIn(['cover', 'prepared_for', 'email'], docModal.email);
        doc.setIn(['cover', 'prepared_for', 'phone'], docModal.phone);
        doc.setIn(['cover', 'prepared_for', 'gst'], docModal.gst);

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

          if (!doc.getIn(['payment', 'bank_details', 'bank_name'])) {
            doc.setIn(['payment', 'bank_details', 'bank_name'], companyProfile.bankName || 'ICICI Bank');
            doc.setIn(['payment', 'bank_details', 'beneficiary'], companyProfile.bankAccountName || companyProfile.companyName);
            doc.setIn(['payment', 'bank_details', 'account_number'], companyProfile.bankAccountNumber || '');
            doc.setIn(['payment', 'bank_details', 'ifsc'], companyProfile.bankIfsc || '');
          }
        }

        const newYaml = doc.toString();
        const initialNextDate = isMaster ? calculateDefaultNextDate('monthly') : undefined;
        const newInvoice: Invoice = {
          id: '',
          workspaceId,
          invoiceId: newId,
          version: '1.0',
          title: docModal.shortTitle || 'Commercial Invoice',
          preparedFor: docModal.companyName || 'Example Client',
          preparedDate: new Date().toISOString(),
          content: newYaml,
          status: 'Unpaid',
          isRecurring: isMaster,
          isRecurringParent: isMaster,
          recurringFrequency: isMaster ? 'monthly' : undefined,
          recurringStartDate: isMaster ? new Date().toISOString() : undefined,
          recurringNextDate: isMaster ? new Date(initialNextDate!).toISOString() : undefined,
          recurringCreatorId: authAccount?.id || undefined,
        };

        const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: newId,
            version: '1.0',
            title: newInvoice.title,
            preparedFor: newInvoice.preparedFor,
            preparedDate: newInvoice.preparedDate,
            content: newYaml,
            status: 'Unpaid',
            isRecurring: isMaster,
            isRecurringParent: isMaster,
            recurringFrequency: isMaster ? 'monthly' : undefined,
            recurringStartDate: isMaster ? new Date().toISOString() : undefined,
            recurringNextDate: isMaster ? new Date(initialNextDate!).toISOString() : undefined,
            recurringCreatorId: authAccount?.id || undefined,
          }),
        });

        if (res.ok) {
          const saved = await res.json();
          await fetchInvoices();
          setActiveInvoice(saved);
          lastChangeSource.current = null;
          setYamlText(newYaml);
          setViewMode('invoice');
          setSearchParams({ id: newId, v: '1.0' });
          setDocModal(prev => ({ ...prev, visible: false }));
          toast(isMaster ? 'Recurring Master Template created!' : 'Invoice draft created!');
        } else {
          const err = await res.text();
          toast(`Error creating invoice: ${err}`);
        }
      } else {
        const target = docModal.invoice;
        if (!target) return;

        const isMaster = Boolean(target.isRecurringParent || docModal.isRecurringMaster);
        const dueDays = docModal.dueDays ?? 20;

        const doc = YAML.parseDocument(target.content);
        doc.setIn(['metadata', 'short_title'], docModal.shortTitle);
        doc.setIn(['metadata', 'currency'], docModal.currency);
        if (docModal.invoiceDate) {
          doc.setIn(['metadata', 'date'], formatDateToLocale(docModal.invoiceDate));
        }
        let finalStatus = target.status || 'Unpaid';
        if (isMaster) {
          doc.setIn(['metadata', 'due_days'], dueDays);
          doc.setIn(['metadata', 'due_date'], `Due in ${dueDays} days`);
        } else if (docModal.dueDate) {
          const formattedDue = formatDateToLocale(docModal.dueDate);
          doc.setIn(['metadata', 'due_date'], formattedDue);
          if (finalStatus.toLowerCase() === 'overdue' && !isDueDatePassed(formattedDue)) {
            finalStatus = 'Unpaid';
            doc.setIn(['metadata', 'status'], 'Unpaid');
          } else if (finalStatus.toLowerCase() === 'unpaid' && isDueDatePassed(formattedDue)) {
            finalStatus = 'Overdue';
            doc.setIn(['metadata', 'status'], 'Overdue');
          }
        }
        doc.setIn(['cover', 'prepared_for', 'company_name'], docModal.companyName);
        doc.setIn(['cover', 'prepared_for', 'lead'], docModal.lead);
        doc.setIn(['cover', 'prepared_for', 'address'], docModal.address);
        doc.setIn(['cover', 'prepared_for', 'email'], docModal.email);
        doc.setIn(['cover', 'prepared_for', 'phone'], docModal.phone);
        doc.setIn(['cover', 'prepared_for', 'gst'], docModal.gst);

        const newYaml = doc.toString();
        const updatedInvoice: Invoice = {
          ...target,
          title: docModal.shortTitle || target.title,
          preparedFor: docModal.companyName || target.preparedFor,
          content: newYaml,
          status: finalStatus,
        };

        if (activeInvoice && activeInvoice.invoiceId === target.invoiceId && activeInvoice.version === target.version) {
          setActiveInvoice(updatedInvoice);
          lastChangeSource.current = null;
          setYamlText(newYaml);
        }

        const saveData = {
          invoiceId: target.invoiceId,
          version: target.version,
          title: updatedInvoice.title,
          preparedFor: updatedInvoice.preparedFor,
          preparedDate: target.preparedDate || new Date().toISOString(),
          content: newYaml,
          status: finalStatus,
          quoteIdConnect: target.quoteIdConnect,
          proposalIdConnect: target.proposalIdConnect,
          isRecurring: target.isRecurring,
          isRecurringParent: target.isRecurringParent,
          parentInvoiceId: target.parentInvoiceId,
        };

        const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData),
        });

        if (res.ok) {
          const saved = await res.json();
          await fetchInvoices();
          if (activeInvoice && activeInvoice.invoiceId === target.invoiceId && activeInvoice.version === target.version) {
            loadInvoice(saved, viewMode);
          }
          toast('Invoice updated successfully!');
        } else {
          const err = await res.text();
          toast(`Error saving invoice: ${err}`);
        }

        setDocModal(prev => ({ ...prev, visible: false }));
      }
    } catch (e: any) {
      toast(`Error processing: ${e.message}`);
    }
  };

  const openCustomChildModal = (inv: Invoice) => {
    setCustomChildModal({
      visible: true,
      masterInvoice: inv,
      customDate: toInputDateFormat(),
      sendEmail: true,
      isSubmitting: false,
    });
  };

  const handleCreateCustomChildSubmit = async () => {
    const { masterInvoice, customDate, sendEmail } = customChildModal;
    if (!masterInvoice) return;

    try {
      setCustomChildModal(prev => ({ ...prev, isSubmitting: true }));
      toast('Creating custom invoice from master...');

      const customDateObj = new Date(customDate || toInputDateFormat());
      const today = new Date();
      const customMidnight = new Date(customDateObj.getFullYear(), customDateObj.getMonth(), customDateObj.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isPastDate = customMidnight < todayMidnight;

      const doc = YAML.parseDocument(masterInvoice.content);
      const rand3 = Math.floor(100 + Math.random() * 900);
      const yyyy = customDateObj.getFullYear();
      const mm = String(customDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(customDateObj.getDate()).padStart(2, '0');
      const subInvoiceId = `${masterInvoice.invoiceId}-${yyyy}${mm}${dd}-${rand3}`;

      const formattedDate = customDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      doc.setIn(['metadata', 'invoice_id'], subInvoiceId);
      doc.setIn(['metadata', 'date'], formattedDate);

      if (isPastDate) {
        // Past date: no due date
        doc.setIn(['metadata', 'due_date'], '');
      } else {
        const rawDueDays = doc.getIn(['metadata', 'due_days']) ?? doc.getIn(['financials', 'due_days']) ?? 20;
        const dueDays = parseInt(String(rawDueDays), 10) || 20;
        const dueDateObj = new Date(customDateObj.getTime() + dueDays * 24 * 60 * 60 * 1000);
        const formattedDueDate = dueDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setIn(['metadata', 'due_date'], formattedDueDate);
      }

      doc.setIn(['metadata', 'status'], 'Unpaid');
      doc.deleteIn(['metadata', 'is_recurring_master']);

      const subYaml = doc.toString();

      const subSaveData = {
        invoiceId: subInvoiceId,
        version: '1.0',
        title: masterInvoice.title,
        preparedFor: masterInvoice.preparedFor,
        preparedDate: customDateObj.toISOString(),
        content: subYaml,
        status: 'Unpaid',
        quoteIdConnect: masterInvoice.quoteIdConnect,
        proposalIdConnect: masterInvoice.proposalIdConnect,
        isRecurring: false,
        isRecurringParent: false,
        parentInvoiceId: masterInvoice.invoiceId,
      };

      const subRes = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subSaveData),
      });

      if (!subRes.ok) {
        const err = await subRes.text();
        toast(`Failed to create custom invoice: ${err}`);
        setCustomChildModal(prev => ({ ...prev, isSubmitting: false }));
        return;
      }

      const createdSub = await subRes.json();

      if (sendEmail) {
        toast('Dispatching recurring email with attached PDF...');
        try {
          const mailRes = await fetch(`/api/workspaces/${workspaceId}/invoices/send-recurring-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoiceId: subInvoiceId,
              version: createdSub?.version || '1.0',
            }),
          });
          if (mailRes.ok) {
            const mailData = await mailRes.json();
            toast(mailData.message || 'Invoice email with PDF sent successfully!');
          } else {
            const mailErr = await mailRes.text();
            toast(`Created invoice, but email send failed: ${mailErr}`);
          }
        } catch (mErr: any) {
          toast(`Created invoice, but email error: ${mErr.message}`);
        }
      } else {
        toast(`Custom child invoice ${subInvoiceId} created!`);
      }

      await fetchInvoices();
      setCustomChildModal({
        visible: false,
        masterInvoice: null,
        customDate: toInputDateFormat(),
        sendEmail: true,
        isSubmitting: false,
      });

      loadInvoice(createdSub, 'invoice');
    } catch (e: any) {
      toast(`Error creating custom child invoice: ${e.message}`);
      setCustomChildModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleBumpVersion = (base: Invoice | null) => {
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
      const updated: Invoice = {
        id: '',
        workspaceId,
        invoiceId: base.invoiceId,
        version: newVer,
        title: base.title,
        preparedFor: base.preparedFor,
        preparedDate: new Date().toISOString(),
        content: newYaml,
        status: base.status,
        isRecurringParent: base.isRecurringParent,
        parentInvoiceId: base.parentInvoiceId,
      };

      setActiveInvoice(updated);
      lastChangeSource.current = null;
      setYamlText(newYaml);
      setSearchParams({ id: base.invoiceId, v: newVer });
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectQuote = (quoteId: string) => {
    try {
      const doc = YAML.parseDocument(yamlText);
      doc.setIn(['metadata', 'quote_id'], quoteId || "[Select Connected Quote]");
      
      const selected = quotes.find(q => q.quoteId === quoteId);
      if (selected) {
        try {
          const quoteParsed = YAML.parse(selected.content);
          if (quoteParsed?.items) {
            doc.set('items', quoteParsed.items);
          }
          if (quoteParsed?.cover?.prepared_for?.company_name) {
            doc.setIn(['cover', 'prepared_for', 'company_name'], quoteParsed.cover.prepared_for.company_name);
          }
        } catch (e) {}
      }
      
      setYamlText(doc.toString());
      toast(`Connected to Quote: ${quoteId || 'none'}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnectProposal = (proposalId: string) => {
    try {
      const doc = YAML.parseDocument(yamlText);
      doc.setIn(['metadata', 'proposal_id'], proposalId || "[Select Connected Proposal]");
      setYamlText(doc.toString());
      toast(`Connected to Proposal: ${proposalId || 'none'}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (forceWithOtp?: string) => {
    if (!activeInvoice || !yamlText) return;
    try {
      let parsed: any = {};
      try {
        parsed = YAML.parse(yamlText);
      } catch (err) {
        toast('Invalid YAML syntax.');
        return;
      }

      const invoiceId = parsed.metadata?.invoice_id || activeInvoice.invoiceId;
      const version = parsed.metadata?.version || activeInvoice.version;
      const title = parsed.metadata?.short_title || activeInvoice.title;
      const preparedFor = parsed.cover?.prepared_for?.company_name || activeInvoice.preparedFor;
      let effectiveYamlText = yamlText;
      let status = parsed.metadata?.status || activeInvoice.status || 'Unpaid';
      const rawDueDate = parsed.metadata?.due_date;
      if (status.toLowerCase() === 'overdue' && rawDueDate && !isDueDatePassed(rawDueDate)) {
        status = 'Unpaid';
        if (parsed.metadata) parsed.metadata.status = 'Unpaid';
        try {
          const doc = YAML.parseDocument(yamlText);
          doc.setIn(['metadata', 'status'], 'Unpaid');
          effectiveYamlText = doc.toString();
          setYamlText(effectiveYamlText);
        } catch (_) {}
      } else if (status.toLowerCase() === 'unpaid' && rawDueDate && isDueDatePassed(rawDueDate)) {
        status = 'Overdue';
        if (parsed.metadata) parsed.metadata.status = 'Overdue';
        try {
          const doc = YAML.parseDocument(yamlText);
          doc.setIn(['metadata', 'status'], 'Overdue');
          effectiveYamlText = doc.toString();
          setYamlText(effectiveYamlText);
        } catch (_) {}
      }
      const quoteIdConnect = parsed.metadata?.quote_id === "[Select Connected Quote]" ? undefined : parsed.metadata?.quote_id;
      const proposalIdConnect = parsed.metadata?.proposal_id === "[Select Connected Proposal]" ? undefined : parsed.metadata?.proposal_id;

      const saveData = {
        invoiceId,
        version,
        title,
        preparedFor,
        preparedDate: new Date().toISOString(),
        content: effectiveYamlText,
        status,
        quoteIdConnect,
        proposalIdConnect,
        otpCode: forceWithOtp,
        isRecurring,
        isRecurringParent: activeInvoice.isRecurringParent,
        parentInvoiceId: activeInvoice.parentInvoiceId,
        recurringFrequency,
        recurringStartDate: isRecurring ? (activeInvoice.recurringStartDate || new Date().toISOString()) : undefined,
        recurringNextDate: isRecurring
          ? (recurringNextDate && recurringNextDate.trim()
              ? new Date(recurringNextDate).toISOString()
              : new Date(calculateDefaultNextDate(recurringFrequency || 'monthly')).toISOString())
          : undefined,
        recurringCreatorId: authAccount?.id || undefined,
        recurringRecipient,
        recurringCc,
      };

      const exists = invoices.some(i => i.invoiceId === invoiceId && i.version === version);
      const existingDoc = invoices.find(i => i.invoiceId === invoiceId && i.version === version);
      let isMetadataOnly = false;
      if (existingDoc) {
        try {
          const oldDoc = YAML.parse(existingDoc.content);
          const newDoc = YAML.parse(yamlText);
          const oldClean = JSON.parse(JSON.stringify(oldDoc || {}));
          const newClean = JSON.parse(JSON.stringify(newDoc || {}));
          if (oldClean.metadata) {
            delete oldClean.metadata.status;
            delete oldClean.metadata.receipt_downloaded;
          }
          if (newClean.metadata) {
            delete newClean.metadata.status;
            delete newClean.metadata.receipt_downloaded;
          }
          delete oldClean.payment;
          delete newClean.payment;
          isMetadataOnly = JSON.stringify(oldClean) === JSON.stringify(newClean);
        } catch (e) {}
      }

      if (exists && !forceWithOtp && !isMetadataOnly) {
        triggerSendOtp('EditInvoice', saveData);
        return;
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        const saved = await res.json();
        setOtpModal({ visible: false, purpose: 'EditInvoice' });
        setOtpCode('');
        setOtpError('');
        await fetchInvoices();
        loadInvoice(saved, viewMode);
        toast('Invoice saved successfully!');
      } else {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      toast(e.message);
    }
  };

  const handleDeleteSubInvoice = (sub: Invoice) => {
    triggerSendOtp('DeleteInvoice', sub);
  };

  const handleDelete = async (forceWithOtp?: string, targetInvoice?: Invoice) => {
    const invToDelete = targetInvoice || otpModal.pendingSaveData || activeInvoice;
    if (!invToDelete || !invToDelete.invoiceId) return;
    
    // Safety constraint: recurring master parent cannot be deleted if sub-invoices exist
    if (invToDelete.isRecurringParent) {
      const hasChildSubs = invoices.some(i => i.parentInvoiceId === invToDelete.invoiceId);
      if (hasChildSubs) {
        toast('Cannot delete a recurring master template while active sub-invoices exist. Please delete all sub-invoices first.');
        return;
      }
    }

    if (!forceWithOtp) {
      triggerSendOtp('DeleteInvoice', invToDelete);
      return;
    }
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invoices/${invToDelete.invoiceId}/${invToDelete.version}?otpCode=${forceWithOtp}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setOtpModal({ visible: false, purpose: 'DeleteInvoice', pendingSaveData: null });
        setOtpCode('');
        setOtpError('');
        if (activeInvoice?.id === invToDelete.id || activeInvoice?.invoiceId === invToDelete.invoiceId) {
          setActiveInvoice(null);
          setYamlText('');
        }
        await fetchInvoices();
        toast('Invoice deleted successfully.');
      } else {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      toast(e.message);
    }
  };

  const handleApplyRecurringSchedule = async () => {
    if (!activeInvoice) return;
    try {
      const targetNextDateStr = recurringNextDate && recurringNextDate.trim()
        ? recurringNextDate
        : calculateDefaultNextDate(recurringFrequency || 'monthly');

      const isActivating = isRecurring;
      const targetDate = new Date(targetNextDateStr);
      const today = new Date();
      const targetDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Disallow past dates
      if (isActivating && targetDateMidnight < todayMidnight) {
        toast('Past dates are not allowed. Please select today or a future date.');
        return;
      }

      let createdSubId: string | null = null;

      // Only if enabling recurring and target date is EXACTLY today, instantly generate a payable sub-invoice
      if (isActivating && targetDateMidnight.getTime() === todayMidnight.getTime()) {
        const doc = YAML.parseDocument(yamlText);
        const rand3 = Math.floor(100 + Math.random() * 900);
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const subInvoiceId = `${activeInvoice.invoiceId}-${yyyy}${mm}${dd}-${rand3}`;
        createdSubId = subInvoiceId;

        const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // Extract due days from master metadata (default to 20 days)
        const rawDueDays = doc.getIn(['metadata', 'due_days']) ?? doc.getIn(['financials', 'due_days']) ?? 20;
        const dueDays = parseInt(String(rawDueDays), 10) || 20;
        const dueDateObj = new Date(today.getTime() + dueDays * 24 * 60 * 60 * 1000);
        const formattedDueDate = dueDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setIn(['metadata', 'invoice_id'], subInvoiceId);
        doc.setIn(['metadata', 'date'], formattedDate);
        doc.setIn(['metadata', 'due_date'], formattedDueDate);
        doc.setIn(['metadata', 'status'], 'Unpaid');
        doc.deleteIn(['metadata', 'is_recurring_master']);

        const subYaml = doc.toString();

        const subSaveData = {
          invoiceId: subInvoiceId,
          version: '1.0',
          title: activeInvoice.title,
          preparedFor: activeInvoice.preparedFor,
          preparedDate: today.toISOString(),
          content: subYaml,
          status: 'Unpaid',
          quoteIdConnect: activeInvoice.quoteIdConnect,
          proposalIdConnect: activeInvoice.proposalIdConnect,
          isRecurring: false,
          isRecurringParent: false,
          parentInvoiceId: activeInvoice.invoiceId,
        };

        const subRes = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subSaveData),
        });

        if (!subRes.ok) {
          const err = await subRes.text();
          toast(`Failed to create sub-invoice: ${err}`);
          return;
        }
      }

      // Advance next schedule date if we just generated an instant sub-invoice for today
      let nextScheduledDate = targetDate;
      if (isActivating && targetDateMidnight.getTime() === todayMidnight.getTime()) {
        nextScheduledDate = calculateNextRecurringDate(today, recurringFrequency || 'monthly');
      }

      const nextScheduledDateStr = nextScheduledDate.toISOString().split('T')[0];
      setRecurringNextDate(nextScheduledDateStr);

      const parentSaveData = {
        invoiceId: activeInvoice.invoiceId,
        version: activeInvoice.version,
        title: activeInvoice.title,
        preparedFor: activeInvoice.preparedFor,
        preparedDate: activeInvoice.preparedDate,
        content: yamlText,
        status: activeInvoice.status,
        quoteIdConnect: activeInvoice.quoteIdConnect,
        proposalIdConnect: activeInvoice.proposalIdConnect,
        isRecurring: isActivating,
        isRecurringParent: true,
        parentInvoiceId: undefined,
        recurringFrequency,
        recurringStartDate: isActivating ? targetDate.toISOString() : undefined,
        recurringNextDate: isActivating ? nextScheduledDate.toISOString() : undefined,
        recurringCreatorId: authAccount?.id || undefined,
        recurringRecipient,
        recurringCc,
      };

      const parentRes = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentSaveData),
      });

      if (parentRes.ok) {
        const savedParent = await parentRes.json();
        setActiveInvoice(savedParent);
        await fetchInvoices();
        setRecurringModalOpen(false);
        if (createdSubId) {
          toast(`Recurring active! Generated sub-invoice ${createdSubId}. Next scheduled: ${nextScheduledDateStr}`);
        } else if (isActivating) {
          toast(`Recurring schedule activated! Next run: ${nextScheduledDateStr}`);
        } else {
          toast('Recurring schedule paused.');
        }
      } else {
        const err = await parentRes.text();
        toast(`Error saving recurring configuration: ${err}`);
      }
    } catch (e: any) {
      toast(`Error: ${e.message}`);
    }
  };

  const triggerSendOtp = async (purpose: 'EditInvoice' | 'DeleteInvoice' | 'ChangeInvoiceStatus', pending?: any) => {
    setOtpModal({ visible: true, purpose, pendingSaveData: pending });
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invoices/otp`, {
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
    if (!iframeRef.current || !activeInvoice) return;
    try {
      const isReceipt = viewMode === 'receipt';
      toast(`Compiling ${isReceipt ? 'Receipt' : 'Invoice'} PDF...`);
      const html = iframeRef.current.contentWindow?.document.documentElement.outerHTML || '';
      
      const endpoint = isReceipt ? '/api/receipts/pdf' : '/api/invoices/pdf';
      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress(endpoint, { html }, setDownloadProgress);
      let filename: string;
      if (isReceipt) {
        const recNo = invoiceData?.payment?.receipt_number || `REC-${activeInvoice.invoiceId.replace('INV-', '')}`;
        filename = `${recNo}_v${activeInvoice.version}.pdf`;
      } else {
        filename = `${activeInvoice.invoiceId}_v${activeInvoice.version}.pdf`;
      }
      await saveBlob(pdfBlob, filename);
      toast(`${isReceipt ? 'Receipt' : 'Invoice'} PDF will be downloaded...`);
    } catch (e: any) {
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const downloadInvoicePdf = async (inv: Invoice) => {
    try {
      toast('Compiling Invoice PDF...');
      let rawTemplate = invoiceTemplateHtml;
      if (!rawTemplate) {
        try {
          const templateRes = await fetch('/invoice_template.html');
          if (templateRes.ok) {
            const templateTxt = await templateRes.text();
            if (templateTxt && (templateTxt.includes('content-wrapper') || templateTxt.includes('header-container') || templateTxt.includes('invoice-box'))) {
              rawTemplate = templateTxt;
            }
          }
        } catch (e) {}
      }
      if (!rawTemplate) {
        throw new Error('Invoice template HTML could not be loaded.');
      }

      const data = YAML.parse(inv.content);
      const isMaster = Boolean(inv.isRecurringParent);
      let html = injectInvoiceData(rawTemplate, data, companyProfile, false, isMaster);
      
      if (html.includes('</body>')) {
        html = html.replace('</body>', scriptToInject + '\n</body>');
      } else {
        html = html + scriptToInject;
      }
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>\n  <base href="/">');
      } else {
        html = '<base href="/">' + html;
      }

      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/invoices/pdf', { html }, setDownloadProgress);
      const filename = `${inv.invoiceId}_v${inv.version}.pdf`;
      await saveBlob(pdfBlob, filename);
      toast('Invoice PDF will be downloaded...');
    } catch (e: any) {
      toast(`Failed to export PDF: ${e.message}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleMarkAsPaid = async (inv: Invoice) => {
    try {
      toast('Marking invoice as paid...');
      const doc = YAML.parseDocument(inv.content);
      doc.setIn(['metadata', 'status'], 'Paid');
      
      let parsed = doc.toJSON();
      if (!parsed.payment) {
        const items = parsed.items || [];
        let subtotal = 0;
        items.forEach((item: any) => {
          const qty = parseFloat(item.qty || item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          subtotal += qty * rate;
        });
        const gstRateVal = parseFloat(parsed.financials?.gst_rate) || 18;
        const totalVal = Math.round(subtotal * (1 + gstRateVal / 100));

        doc.set('payment', {
          amount_paid: totalVal,
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          method: 'Bank Transfer',
          transaction_id: 'TXN_' + Math.floor(1000000 + Math.random() * 9000000),
          receipt_number: `REC-${inv.invoiceId.replace('INV-', '')}`,
          notes: 'Payment received. Thank you!'
        });
      }
      
      const updatedYaml = doc.toString();
      parsed = doc.toJSON();
      
      const saveData = {
        invoiceId: inv.invoiceId,
        version: inv.version,
        title: parsed.metadata?.short_title || inv.title,
        preparedFor: parsed.cover?.prepared_for?.company_name || inv.preparedFor,
        preparedDate: inv.preparedDate,
        content: updatedYaml,
        status: 'Paid',
        quoteIdConnect: parsed.metadata?.quote_id === "[Select Connected Quote]" ? undefined : parsed.metadata?.quote_id,
        proposalIdConnect: parsed.metadata?.proposal_id === "[Select Connected Proposal]" ? undefined : parsed.metadata?.proposal_id,
        isRecurring: inv.isRecurring,
        isRecurringParent: inv.isRecurringParent,
        parentInvoiceId: inv.parentInvoiceId,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        const saved = await res.json();
        await fetchInvoices();
        if (activeInvoice && activeInvoice.invoiceId === inv.invoiceId && activeInvoice.version === inv.version) {
          // Force a full iframe re-render so status badge/class updates visually
          lastLoadedInvoiceRef.current = null;
          setActiveInvoice(saved);
          setYamlText(updatedYaml);
        }
        toast('Invoice marked as Paid successfully!');
        // Dispatch official payment receipt email with attached PDF
        fetch(`/api/workspaces/${workspaceId}/invoices/send-receipt-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: inv.invoiceId, version: inv.version }),
        }).then(async r => {
          if (r.ok) {
            const d = await r.json();
            toast(d.message || 'Payment receipt email dispatched!');
          }
        }).catch(err => {
          console.warn('Failed to send receipt email:', err);
        });
      } else {
        const err = await res.text();
        toast(`Failed to mark invoice as paid: ${err}`);
      }
    } catch (e: any) {
      toast(`Error: ${e.message}`);
    }
  };

  const handleStatusChange = (inv: Invoice, newStatus: string) => {
    if (inv.status === newStatus) return;
    setPendingStatusChange({ invoice: inv, newStatus });
    triggerSendOtp('ChangeInvoiceStatus');
  };

  const confirmStatusChange = async (otpCodeVal: string) => {
    if (!pendingStatusChange) return;
    const { invoice: inv, newStatus } = pendingStatusChange;
    try {
      toast(`Updating status to ${newStatus}...`);
      const doc = YAML.parseDocument(inv.content);
      doc.setIn(['metadata', 'status'], newStatus);
      
      let parsed = doc.toJSON();
      if (newStatus === 'Paid') {
        if (!parsed.payment) {
          const items = parsed.items || [];
          let subtotal = 0;
          items.forEach((item: any) => {
            const qty = parseFloat(item.qty || item.quantity) || 0;
            const rate = parseFloat(item.rate) || 0;
            subtotal += qty * rate;
          });
          const gstRateVal = parseFloat(parsed.financials?.gst_rate) || 18;
          const totalVal = Math.round(subtotal * (1 + gstRateVal / 100));

          doc.set('payment', {
            amount_paid: totalVal,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            method: 'Bank Transfer',
            transaction_id: 'TXN_' + Math.floor(1000000 + Math.random() * 9000000),
            receipt_number: `REC-${inv.invoiceId.replace('INV-', '')}`,
            notes: 'Payment received. Thank you!'
          });
        }
      } else {
        doc.delete('payment');
      }
      
      const updatedYaml = doc.toString();
      parsed = doc.toJSON();
      
      const saveData = {
        invoiceId: inv.invoiceId,
        version: inv.version,
        title: parsed.metadata?.short_title || inv.title,
        preparedFor: parsed.cover?.prepared_for?.company_name || inv.preparedFor,
        preparedDate: inv.preparedDate,
        content: updatedYaml,
        status: newStatus,
        quoteIdConnect: parsed.metadata?.quote_id === "[Select Connected Quote]" ? undefined : parsed.metadata?.quote_id,
        proposalIdConnect: parsed.metadata?.proposal_id === "[Select Connected Proposal]" ? undefined : parsed.metadata?.proposal_id,
        otpCode: otpCodeVal,
        isRecurring: inv.isRecurring,
        isRecurringParent: inv.isRecurringParent,
        parentInvoiceId: inv.parentInvoiceId,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (res.ok) {
        const saved = await res.json();
        setOtpModal({ visible: false, purpose: 'EditInvoice' });
        setOtpCode('');
        setOtpError('');
        setPendingStatusChange(null);
        await fetchInvoices();
        if (activeInvoice && activeInvoice.invoiceId === inv.invoiceId && activeInvoice.version === inv.version) {
          lastLoadedInvoiceRef.current = null;
          setActiveInvoice(saved);
          setYamlText(updatedYaml);
        }
        toast(`Invoice status updated to ${newStatus} successfully!`);
        if (newStatus === 'Paid') {
          // Dispatch official payment receipt email with attached PDF
          fetch(`/api/workspaces/${workspaceId}/invoices/send-receipt-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId: inv.invoiceId, version: inv.version }),
          }).then(async r => {
            if (r.ok) {
              const d = await r.json();
              toast(d.message || 'Payment receipt email dispatched!');
            }
          }).catch(err => {
            console.warn('Failed to send receipt email:', err);
          });
        }
      } else {
        const err = await res.text();
        setOtpError(err);
      }
    } catch (e: any) {
      setOtpError(e.message);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!activeInvoice) return;
    try {
      toast('Marking Receipt as Downloaded & Saving...');
      let rawTemplate = receiptTemplateHtml;
      if (!rawTemplate) {
        try {
          const recRes = await fetch('/receipt_template.html');
          if (recRes.ok) {
            rawTemplate = await recRes.text();
          }
        } catch (e) {}
      }
      if (!rawTemplate) throw new Error('Receipt template could not be loaded.');
      
      // Use database persisted content as the base to guarantee a metadata-only change!
      const doc = YAML.parseDocument(activeInvoice.content);
      doc.setIn(['metadata', 'receipt_downloaded'], true);
      doc.setIn(['metadata', 'status'], 'Paid');
      
      let parsedObj = doc.toJSON();
      if (!parsedObj.payment) {
        const items = parsedObj.items || [];
        let subtotal = 0;
        items.forEach((item: any) => {
          const qty = parseFloat(item.qty || item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          subtotal += qty * rate;
        });
        const gstRateVal = parseFloat(parsedObj.financials?.gst_rate) || 18;
        const totalVal = Math.round(subtotal * (1 + gstRateVal / 100));

        doc.set('payment', {
          amount_paid: totalVal,
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          method: 'Bank Transfer',
          transaction_id: 'TXN_' + Math.floor(1000000 + Math.random() * 9000000),
          receipt_number: `REC-${activeInvoice.invoiceId.replace('INV-', '')}`,
          notes: 'Payment received. Thank you!'
        });
        parsedObj = doc.toJSON();
      }
      
      const updatedYaml = doc.toString();
      setYamlText(updatedYaml);

      const invoiceId = parsedObj.metadata?.invoice_id || activeInvoice.invoiceId;
      const version = parsedObj.metadata?.version || activeInvoice.version;
      const title = parsedObj.metadata?.short_title || activeInvoice.title;
      const preparedFor = parsedObj.cover?.prepared_for?.company_name || activeInvoice.preparedFor;
      const status = parsedObj.metadata?.status || 'Paid';
      const quoteIdConnect = parsedObj.metadata?.quote_id === "[Select Connected Quote]" ? undefined : parsedObj.metadata?.quote_id;
      const proposalIdConnect = parsedObj.metadata?.proposal_id === "[Select Connected Proposal]" ? undefined : parsedObj.metadata?.proposal_id;

      const saveData = {
        invoiceId,
        version,
        title,
        preparedFor,
        preparedDate: activeInvoice.preparedDate,
        content: updatedYaml,
        status,
        quoteIdConnect,
        proposalIdConnect,
        isRecurring: activeInvoice.isRecurring,
        isRecurringParent: activeInvoice.isRecurringParent,
        parentInvoiceId: activeInvoice.parentInvoiceId,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      if (!res.ok) {
        const err = await res.text();
        toast(`Failed to save invoice metadata: ${err}`);
        return;
      }

      const savedInvoice = await res.json();
      await fetchInvoices();
      setActiveInvoice(savedInvoice);

      toast('Compiling Receipt PDF...');
      let receiptHtml = injectReceiptData(rawTemplate, parsedObj, companyProfile);
      if (receiptHtml.includes('<head>')) {
        receiptHtml = receiptHtml.replace('<head>', '<head>\n  <base href="/">');
      } else {
        receiptHtml = '<base href="/">' + receiptHtml;
      }
      
      setDownloadProgress(0);
      const pdfBlob = await fetchPdfWithProgress('/api/receipts/pdf', { html: receiptHtml }, setDownloadProgress);
      const recNo = parsedObj.payment?.receipt_number || `REC-${invoiceId.replace('INV-', '')}`;
      await saveBlob(pdfBlob, `${recNo}_v${version}.pdf`);
      toast('Receipt PDF will be downloaded...');
      
      setViewMode('receipt');
    } catch (err: any) {
      toast(err.message);
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleExportYaml = () => {
    if (!yamlText) return;
    const blob = new Blob([yamlText], { type: 'application/x-yaml' });
    const filename = `${activeInvoice?.invoiceId || 'invoice'}.yaml`;
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
        
        const invoiceId = metadata.invoice_id || `INV-2026-IMP-${Math.floor(100000 + Math.random() * 900000)}`;
        const version = metadata.version || '1.0';
        const title = metadata.short_title || 'Imported Invoice';
        const preparedFor = cover.prepared_for?.company_name || 'Example Client';
        
        const importedInvoice: Invoice = {
          id: '',
          workspaceId,
          invoiceId,
          version,
          title,
          preparedFor,
          preparedDate: new Date().toISOString(),
          content: text,
          status: metadata.status || 'Unpaid',
          quoteIdConnect: metadata.quote_id === "[Select Connected Quote]" ? undefined : metadata.quote_id,
          proposalIdConnect: metadata.proposal_id === "[Select Connected Proposal]" ? undefined : metadata.proposal_id
        };

        setActiveInvoice(importedInvoice);
        lastChangeSource.current = null;
        setYamlText(text);
        setViewMode('invoice');
        toast('YAML file imported successfully!');
      } catch (err: any) {
        toast(`Failed to parse YAML: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const activeInvoiceQuoteId = useMemo(() => {
    if (!yamlText) return '';
    try {
      const parsed = YAML.parse(yamlText);
      return parsed.metadata?.quote_id || '';
    } catch (e) { return ''; }
  }, [yamlText]);

  const activeInvoiceProposalId = useMemo(() => {
    if (!yamlText) return '';
    try {
      const parsed = YAML.parse(yamlText);
      return parsed.metadata?.proposal_id || '';
    } catch (e) { return ''; }
  }, [yamlText]);

  const handleBackToDashboard = () => {
    setActiveInvoice(null);
    setActiveKey(null);
    setViewMode('invoice');
    setSearchParams({});
  };

  return (
    <div className={styles.container}>
      {/* MAIN CONTENT AREA */}
      <div className={styles.mainContent}>
        {activeInvoice ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', width: '100%' }}>

            {/* ── COMPACT HEADER (always single row, never wraps) ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              height: '48px',
              minHeight: '48px',
              flexShrink: 0,
              backgroundColor: 'var(--affine-background-primary-color)',
              borderBottom: '1px solid var(--affine-border-color)',
              gap: '8px',
              overflow: 'visible',
              zIndex: 10,
            }}>
              {/* LEFT breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, overflow: 'hidden', minWidth: 0, maxWidth: '40%' }}>
                <button
                  onClick={handleBackToDashboard}
                  style={{ border: 'none', padding: '2px 6px', background: 'transparent', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  ← Dashboard
                </button>
                <span style={{ color: 'var(--affine-text-secondary-color)', flexShrink: 0 }}>/</span>
                <span style={{ fontSize: '14px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {viewMode === 'receipt'
                    ? (invoiceData?.payment?.receipt_number || `REC-${activeInvoice.invoiceId.replace('INV-', '')}`)
                    : activeInvoice.invoiceId}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeInvoice.title}
                </span>
              </div>

              {/* Flexible spacer */}
              <div style={{ flex: 1 }} />

              {/* RIGHT actions — all on one row, never wrap */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'nowrap' }}>
                {viewMode === 'invoice' ? (
                  <>
                    {isPaid && isReceiptDownloaded && (
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }}
                        onClick={() => setViewMode('receipt')}
                      >
                        View Receipt
                      </button>
                    )}
                    {isPaid && (
                      <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={handleDownloadReceipt}
                        style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }}
                      >
                        ↓ Receipt
                      </button>
                    )}

                    {/* Status Display: Master template indicator vs status dropdown */}
                    {activeInvoice.isRecurringParent ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.5px' }}>
                          RECURRING MASTER
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', whiteSpace: 'nowrap' }}>Status:</span>
                        <select
                          value={activeInvoice.status}
                          onChange={(e) => handleStatusChange(activeInvoice, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px', fontWeight: 500, backgroundColor: '#ffffff', color: '#374151', cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>
                    )}

                    {/* Recurring settings button (ONLY for master parent template) */}
                    {activeInvoice.isRecurringParent && (
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        style={{
                          fontSize: '12px',
                          padding: '5px 10px',
                          whiteSpace: 'nowrap',
                          borderColor: isRecurring ? '#2563eb' : undefined,
                          color: isRecurring ? '#2563eb' : undefined,
                          backgroundColor: isRecurring ? '#eff6ff' : undefined,
                          fontWeight: isRecurring ? 600 : undefined,
                        }}
                        onClick={() => setRecurringModalOpen(true)}
                      >
                        <TablerRepeatIcon style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }} />
                        <span>{isRecurring ? 'Recurring: Active' : 'Set Recurring'}</span>
                      </button>
                    )}

                    <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={handleExportPdf}>
                      Export PDF
                    </button>
                    
                    {!activeInvoice.parentInvoiceId && (
                      <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={() => handleSave()}>
                        Save Invoice
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={() => setViewMode('invoice')}>
                      View Invoice
                    </button>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={handleExportPdf}>
                      Export PDF
                    </button>
                    {!activeInvoice.parentInvoiceId && (
                      <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ fontSize: '12px', padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={() => handleSave()}>
                        Save
                      </button>
                    )}
                  </>
                )}

                {/* ⋮ More Actions */}
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
                    <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto', minWidth: '240px' }}>
                      {viewMode === 'invoice' && !activeInvoice.parentInvoiceId && (
                        <>
                          <div className={styles.dropdownHeader}>Connect To</div>
                          <div style={{ padding: '0 6px 4px' }}>
                            <select
                              value={activeInvoiceQuoteId}
                              onChange={e => { handleConnectQuote(e.target.value); setActionsMenuOpen(false); }}
                              style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '4px', outline: 'none', cursor: 'pointer', color: '#374151' }}
                            >
                              <option value="">-- Link to Quote --</option>
                              {quotes.map(q => (
                                <option key={q.id} value={q.quoteId}>{q.quoteId} – {q.title}</option>
                              ))}
                            </select>
                            <select
                              value={activeInvoiceProposalId}
                              onChange={e => { handleConnectProposal(e.target.value); setActionsMenuOpen(false); }}
                              style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', outline: 'none', cursor: 'pointer', color: '#374151' }}
                            >
                              <option value="">-- Link to Proposal --</option>
                              {proposals.map(p => (
                                <option key={p.id} value={p.proposalId}>{p.proposalId} – {p.title}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '2px 0 4px' }} />
                        </>
                      )}
                      {!activeInvoice.parentInvoiceId && (
                        <>
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
                        </>
                      )}
                      {activeInvoice?.id && (
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => { handleDelete(); setActionsMenuOpen(false); }}
                        >
                          <span>Delete Invoice</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SPLIT PANE: flex:1 + minHeight:0 = fills all remaining height regardless of header size */}
            <div
              style={{ display: 'flex', flexDirection: 'row', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}
              ref={splitPaneRef}
            >
              {/* IFRAME PREVIEW */}
              <div
                style={{
                  width: `${splitPercent}%`,
                  flex: `0 0 ${splitPercent}%`,
                  minWidth: 0,
                  height: '100%',
                  position: 'relative',
                  backgroundColor: '#f1f5f9',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={iframeSrcDoc}
                    title="Invoice Render Preview"
                    style={{
                      width: '100%',
                      flex: '1 1 auto',
                      minHeight: 0,
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                      backgroundColor: '#ffffff',
                      pointerEvents: isResizing ? 'none' : 'auto',
                    }}
                  />
                  {/* Iframe overlay when OTP modal is open */}
                  {otpModal.visible && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      zIndex: 99999,
                      borderRadius: '12px',
                    }} />
                  )}
                </div>
              </div>

              {/* RESIZER BAR */}
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

              {/* YAML EDITOR */}
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
                {activeInvoice.parentInvoiceId && (
                  <div style={{ padding: '8px 16px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px' }}>🔒</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                      Read-only sub-invoice. Template structure and items are managed by master template <strong>{activeInvoice.parentInvoiceId}</strong>.
                    </span>
                  </div>
                )}
                <div style={{ padding: '8px 16px', backgroundColor: '#27272a', borderBottom: '1px solid #3f3f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#a1a1aa' }}>Invoice YAML Config</span>
                    {activeKey && (
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500 }}>
                        Active: {activeKey}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                    {activeInvoice.parentInvoiceId ? 'Read-only' : 'Save manually to apply'}
                  </div>
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
                    readOnly={Boolean(activeInvoice.parentInvoiceId)}
                    onChange={e => {
                      if (activeInvoice.parentInvoiceId) return;
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
                      opacity: activeInvoice.parentInvoiceId ? 0.8 : 1,
                      cursor: activeInvoice.parentInvoiceId ? 'not-allowed' : 'text',
                      transition: 'box-shadow 0.3s ease',
                      boxShadow: yamlFlash ? '0 0 0 2px rgba(251, 191, 36, 0.5)' : undefined,
                    }}
                    placeholder="# YAML invoice content goes here..."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* UNIFIED DASHBOARD CARD VIEW WITH TABS */
          <div className={styles.dashboardContainer}>
            <div className={styles.dashboardHeader}>
              <div>
                <h1 className={styles.dashboardTitle}>Project Invoices & Receipts</h1>
                <p className={styles.dashboardSubtitle}>
                  Create, manage, and track commercial invoices and download payment receipts.
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
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

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

                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleCreateNew}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>New Invoice</span>
                </button>
              </div>
            </div>

            {/* Modern Tab Bar */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0px', marginBottom: '-8px', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '12px 8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderBottom: dashboardTab === 'invoices' ? '2px solid #2563eb' : '2px solid transparent',
                  color: dashboardTab === 'invoices' ? '#2563eb' : '#64748b',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => setDashboardTab('invoices')}
              >
                Invoices ({getGroupedInvoices().length})
              </button>
              <button
                style={{
                  padding: '12px 8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  borderBottom: dashboardTab === 'receipts' ? '2px solid #2563eb' : '2px solid transparent',
                  color: dashboardTab === 'receipts' ? '#2563eb' : '#64748b',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => setDashboardTab('receipts')}
              >
                Payment Receipts ({getGroupedReceipts().length})
              </button>
            </div>

            {dashboardTab === 'invoices' ? (
              <div className={styles.dashboardCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '170px' }}>Invoice ID</th>
                      <th>Title</th>
                      <th>Prepared For</th>
                      <th style={{ width: '120px' }}>Status</th>
                      <th style={{ width: '110px' }}>Date</th>
                      <th style={{ width: '130px' }}>Due Date</th>
                      <th style={{ width: '140px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupedInvoices().map((group) => {
                      const latest = group.versions[0];
                      const isMaster = Boolean(latest.isRecurringParent || group.isRecurringParent);
                      const subInvoices = group.subInvoices || [];
                      const hasSubs = subInvoices.length > 0;
                      const isExpanded = Boolean(expandedDocs[group.invoiceId]);

                      const statusLower = latest.status.toLowerCase();
                      let statusBg = '#e2e8f0';
                      let statusText = '#475569';
                      if (statusLower === 'paid') {
                        statusBg = '#d1fae5';
                        statusText = '#065f46';
                      } else if (statusLower === 'unpaid') {
                        statusBg = '#fef3c7';
                        statusText = '#92400e';
                      } else if (statusLower === 'overdue') {
                        statusBg = '#fee2e2';
                        statusText = '#991b1b';
                      }
                      
                      return (
                        <React.Fragment key={group.invoiceId}>
                          <tr 
                            className={styles.tableRow}
                            onClick={() => {
                              setViewMode('invoice');
                              loadInvoice(latest);
                            }}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isMaster && hasSubs ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDocExpand(group.invoiceId);
                                    }}
                                    style={{
                                      border: 'none',
                                      background: isExpanded ? '#e2e8f0' : 'transparent',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      transition: 'all 0.2s ease',
                                      color: isExpanded ? '#1e293b' : '#64748b',
                                      flexShrink: 0,
                                    }}
                                    title={isExpanded ? 'Collapse sub-invoices' : 'Expand sub-invoices'}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      style={{
                                        transition: 'transform 0.2s ease',
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                      }}
                                    >
                                      <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                  </button>
                                ) : (
                                  <div style={{ width: '28px' }} />
                                )}
                                <span style={{ fontWeight: 600, display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={group.invoiceId}>
                                  {group.invoiceId}
                                </span>
                                {isMaster && hasSubs && (
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDocExpand(group.invoiceId);
                                    }}
                                    style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                                    title="Click to toggle sub-invoices"
                                  >
                                    ({subInvoices.length})
                                  </span>
                                )}
                              </div>
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
                              {isMaster ? (
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  letterSpacing: '0.3px',
                                  backgroundColor: latest.isRecurring ? '#eff6ff' : '#f1f5f9',
                                  color: latest.isRecurring ? '#1d4ed8' : '#64748b',
                                  border: `1px solid ${latest.isRecurring ? '#bfdbfe' : '#e2e8f0'}`,
                                  maxWidth: '130px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  verticalAlign: 'middle'
                                }} title={latest.isRecurring ? 'Recurring: Active' : 'Recurring: Paused'}>
                                  {latest.isRecurring ? 'RECURRING (ACTIVE)' : 'RECURRING (PAUSED)'}
                                </span>
                              ) : (() => {
                                const latestStatus = getInvoiceEffectiveStatus(latest);
                                const latestStatusLower = latestStatus.toLowerCase();
                                let statusBg = '#e2e8f0';
                                let statusText = '#475569';
                                if (latestStatusLower === 'paid') {
                                  statusBg = '#d1fae5';
                                  statusText = '#065f46';
                                } else if (latestStatusLower === 'unpaid') {
                                  statusBg = '#fef3c7';
                                  statusText = '#92400e';
                                } else if (latestStatusLower === 'overdue') {
                                  statusBg = '#fee2e2';
                                  statusText = '#991b1b';
                                }

                                return (
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    textTransform: 'uppercase',
                                    backgroundColor: statusBg,
                                    color: statusText,
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle'
                                  }} title={latestStatus}>
                                    {latestStatus}
                                  </span>
                                );
                              })()}
                            </td>
                            <td>
                              <span style={{ display: 'inline-block', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={new Date(group.latestDate).toLocaleDateString()}>
                                {new Date(group.latestDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td>
                              <span style={{ display: 'inline-block', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '12px', color: '#475569', fontWeight: 500 }} title={group.dueDate}>
                                {group.dueDate}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  className={styles.tableActionBtn}
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                  onClick={() => openEditModal(latest)}
                                  title="Edit Info"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className={styles.tableActionBtn}
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                  onClick={() => {
                                    downloadInvoicePdf(latest);
                                  }}
                                  title="Download PDF"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                </button>
                                {isMaster ? (
                                  <button
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                    style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap', fontWeight: 600, color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                                    onClick={() => {
                                      openCustomChildModal(latest);
                                    }}
                                    title="Create custom child invoice for any date"
                                  >
                                    Create Custom
                                  </button>
                                ) : (
                                  <select 
                                    value={getInvoiceEffectiveStatus(latest)}
                                    onChange={(e) => handleStatusChange(latest, e.target.value)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #d1d5db',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      backgroundColor: '#ffffff',
                                      color: '#374151',
                                      cursor: 'pointer',
                                      outline: 'none',
                                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                  >
                                    <option value="Paid">Paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Overdue">Overdue</option>
                                  </select>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Sub-invoices rows when expanded */}
                          {isMaster && isExpanded && subInvoices.map((sub) => {
                            const subStatus = getInvoiceEffectiveStatus(sub);
                            const subStatusLower = subStatus.toLowerCase();
                            let subStatusBg = '#e2e8f0';
                            let subStatusText = '#475569';
                            if (subStatusLower === 'paid') {
                              subStatusBg = '#d1fae5';
                              subStatusText = '#065f46';
                            } else if (subStatusLower === 'unpaid') {
                              subStatusBg = '#fef3c7';
                              subStatusText = '#92400e';
                            } else if (subStatusLower === 'overdue') {
                              subStatusBg = '#fee2e2';
                              subStatusText = '#991b1b';
                            }

                            return (
                              <tr
                                key={sub.id || sub.invoiceId}
                                className={styles.tableRow}
                                style={{ backgroundColor: '#f8fafc', borderLeft: '3px solid #3b82f6' }}
                                onClick={() => {
                                  setViewMode('invoice');
                                  loadInvoice(sub);
                                }}
                              >
                                <td style={{ paddingLeft: '36px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.invoiceId}>
                                    └ {sub.invoiceId}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '12px', color: '#475569', display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.title}>
                                    {sub.title}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '12px', color: '#475569', display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.preparedFor}>
                                    {sub.preparedFor}
                                  </span>
                                </td>
                                <td>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    textTransform: 'uppercase',
                                    backgroundColor: subStatusBg,
                                    color: subStatusText,
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }} title={subStatus}>
                                    {subStatus}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '12px', color: '#64748b' }} title={new Date(sub.preparedDate).toLocaleDateString()}>
                                    {new Date(sub.preparedDate).toLocaleDateString()}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }} title={getInvoiceDueDate(sub)}>
                                    {getInvoiceDueDate(sub)}
                                  </span>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      className={styles.tableActionBtn}
                                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}
                                      onClick={() => downloadInvoicePdf(sub)}
                                      title="Download PDF"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                      </svg>
                                    </button>
                                    <button
                                      className={styles.tableActionBtn}
                                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px', color: '#ef4444' }}
                                      onClick={() => handleDeleteSubInvoice(sub)}
                                      title="Delete Sub-Invoice"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                    <select 
                                      value={getInvoiceEffectiveStatus(sub)}
                                      onChange={(e) => handleStatusChange(sub, e.target.value)}
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        backgroundColor: '#ffffff',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                      }}
                                    >
                                      <option value="Paid">Paid</option>
                                      <option value="Unpaid">Unpaid</option>
                                      <option value="Overdue">Overdue</option>
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    {getGroupedInvoices().length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#71717a' }}>
                          No invoices found. Click "+ New Invoice" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.dashboardCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '180px' }}>Receipt ID</th>
                      <th>Invoice Ref</th>
                      <th>Associated Project</th>
                      <th>Paid By</th>
                      <th style={{ width: '120px' }}>Total Paid</th>
                      <th style={{ width: '150px' }}>Date Generated</th>
                      <th style={{ width: '100px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupedReceipts().map((item) => {
                      const recNumber = item.data.payment?.receipt_number || `REC-${item.invoice.invoiceId.replace('INV-', '')}`;
                      
                      const itemsList = item.data.items || [];
                      let subtotalVal = 0;
                      itemsList.forEach((it: any) => {
                        const qty = parseFloat(it.qty || it.quantity) || 0;
                        const rate = parseFloat(it.rate) || 0;
                        subtotalVal += qty * rate;
                      });
                      const gstRateVal = parseFloat(item.data.financials?.gst_rate) || 18;
                      const totalVal = subtotalVal * (1 + gstRateVal / 100);
                      const displayAmt = '₹' + totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      
                      const receiptDate = item.data.payment?.date || item.invoice.preparedDate;
                      
                      return (
                        <tr 
                          key={item.invoice.id}
                          className={styles.tableRow}
                          onClick={() => {
                            setViewMode('receipt');
                            loadInvoice(item.invoice, 'receipt');
                          }}
                        >
                          <td>
                            <span style={{ fontWeight: 600, display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={recNumber}>
                              {recNumber}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={item.invoice.invoiceId}>
                              {item.invoice.invoiceId}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={item.invoice.title}>
                              {item.invoice.title}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={item.invoice.preparedFor}>
                              {item.invoice.preparedFor}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#0f172a', display: 'inline-block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={displayAmt}>
                              {displayAmt}
                            </span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-block', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={new Date(receiptDate).toLocaleDateString()}>
                              {new Date(receiptDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              fontSize: '11px',
                              padding: '2px 8px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              backgroundColor: '#d1fae5',
                              color: '#065f46',
                              maxWidth: '100px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle'
                            }} title="PAID">
                              PAID
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {getGroupedReceipts().length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#71717a' }}>
                          No payment receipts downloaded yet. Mark an invoice as Paid and click "Download Receipt" to view it here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
        onCancel={() => { setOtpModal({ visible: false, purpose: 'EditInvoice' }); setPendingStatusChange(null); }}
        onConfirm={(code) => {
          if (otpModal.purpose === 'EditInvoice') {
            handleSave(code);
          } else if (otpModal.purpose === 'DeleteInvoice') {
            handleDelete(code, otpModal.pendingSaveData);
          } else if (otpModal.purpose === 'ChangeInvoiceStatus') {
            confirmStatusChange(code);
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
      {/* Recurring Invoice Settings Modal */}
      {recurringModalOpen && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 16 14" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--affine-text-primary-color)' }}>
                  Recurring Invoice Settings
                </h3>
              </div>
              <button onClick={() => setRecurringModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <CloseIconSvg />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Enable Toggle Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--affine-text-primary-color)' }}>
                  Enable Auto-Recurring Schedule
                </label>
                <div 
                  onClick={() => {
                    const nextVal = !isRecurring;
                    setIsRecurring(nextVal);
                    if (nextVal && (!recurringNextDate || !recurringNextDate.trim())) {
                      setRecurringNextDate(calculateDefaultNextDate(recurringFrequency || 'monthly'));
                    }
                  }}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    backgroundColor: isRecurring ? '#2563eb' : '#d1d5db',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    position: 'absolute',
                    top: '2px',
                    left: isRecurring ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {isRecurring && (
                <>
                  {/* Frequency */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Billing Interval</label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => {
                        const newFreq = e.target.value;
                        setRecurringFrequency(newFreq);
                        if (isRecurring && (!recurringNextDate || !recurringNextDate.trim())) {
                          setRecurringNextDate(calculateDefaultNextDate(newFreq));
                        }
                      }}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly (Every 3 Months)</option>
                      <option value="half_year">Half-Year (Every 6 Months)</option>
                      <option value="year">Yearly</option>
                    </select>
                  </div>

                  {/* Next Date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Next Run / Start Date</label>
                    {(() => {
                      const isPastSelected = (() => {
                        if (!recurringNextDate) return false;
                        const targetDate = new Date(recurringNextDate);
                        const today = new Date();
                        const targetDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        return targetDateMidnight < todayMidnight;
                      })();

                      return (
                        <>
                          <input
                            type="date"
                            min={toInputDateFormat()}
                            value={recurringNextDate}
                            onChange={(e) => setRecurringNextDate(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${isPastSelected ? '#ef4444' : '#d1d5db'}`,
                              fontSize: '13px',
                              outline: 'none',
                              backgroundColor: isPastSelected ? '#fff5f5' : '#fff'
                            }}
                          />
                          {isPastSelected && (
                            <div style={{
                              marginTop: '2px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#991b1b',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              lineHeight: 1.3,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span>Past dates are not allowed. Please select today or a future date.</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Recipient email */}
                  <div style={{ display: 'none' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Recipient Billing Email(s) (Comma separated)</label>
                    <input
                      type="email"
                      value={recurringRecipient}
                      onChange={(e) => setRecurringRecipient(e.target.value)}
                      placeholder="billing@client.com"
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      Defaults to Workspace Profile billing email.
                    </span>
                  </div>

                  {/* CC Email */}
                  <div style={{ display: 'none' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>CC Email (Defaults to your profile email)</label>
                    <input
                      type="email"
                      value={recurringCc}
                      onChange={(e) => setRecurringCc(e.target.value)}
                      placeholder="me@company.com"
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </>
              )}

              {(() => {
                const isPastSelected = isRecurring && (() => {
                  if (!recurringNextDate) return false;
                  const targetDate = new Date(recurringNextDate);
                  const today = new Date();
                  const targetDateMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return targetDateMidnight < todayMidnight;
                })();

                return (
                  <button
                    className={styles.btnPrimary}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      marginTop: '8px',
                      opacity: isPastSelected ? 0.5 : 1,
                      cursor: isPastSelected ? 'not-allowed' : 'pointer'
                    }}
                    onClick={isPastSelected ? undefined : handleApplyRecurringSchedule}
                    disabled={Boolean(isPastSelected)}
                  >
                    Apply Configuration
                  </button>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
      <InvoiceModal
        docModal={docModal}
        setDocModal={setDocModal}
        onSubmit={submitDocModal}
      />

      {/* Create Custom Child Invoice Modal */}
      {customChildModal.visible && customChildModal.masterInvoice && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--affine-text-primary-color)', margin: 0 }}>
                    Create Custom Child Invoice
                  </h3>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    From master: {customChildModal.masterInvoice.invoiceId}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setCustomChildModal(prev => ({ ...prev, visible: false, masterInvoice: null }))}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                disabled={customChildModal.isSubmitting}
              >
                <CloseIconSvg />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                  Invoice Generation Date
                </label>
                <input
                  type="date"
                  value={customChildModal.customDate}
                  onChange={(e) => setCustomChildModal(prev => ({ ...prev, customDate: e.target.value }))}
                  disabled={customChildModal.isSubmitting}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* Due date explanation hint */}
              {(() => {
                const selDate = new Date(customChildModal.customDate || toInputDateFormat());
                const now = new Date();
                const selMidnight = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate());
                const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isPast = selMidnight < nowMidnight;

                return (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: isPast ? '#fef3c7' : '#eff6ff',
                    border: `1px solid ${isPast ? '#fde68a' : '#bfdbfe'}`,
                    fontSize: '12px',
                    color: isPast ? '#92400e' : '#1e40af',
                    lineHeight: '1.4',
                  }}>
                    {isPast ? (
                      <div>
                        <strong>Past Date Selected:</strong> This invoice will be issued as of {selDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} with <strong>no due date</strong>.
                      </div>
                    ) : (
                      <div>
                        <strong>Current/Future Date Selected:</strong> Payment due date will be automatically computed according to the master payment terms.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Send email toggle card */}
              <div
                onClick={() => !customChildModal.isSubmitting && setCustomChildModal(prev => ({ ...prev, sendEmail: !prev.sendEmail }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: customChildModal.sendEmail ? '#f0fdf4' : '#f9fafb',
                  border: `1px solid ${customChildModal.sendEmail ? '#86efac' : '#e5e7eb'}`,
                  cursor: customChildModal.isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: customChildModal.sendEmail ? '#15803d' : '#374151' }}>
                    Send recurring invoice email
                  </div>
                  <div style={{ fontSize: '11px', color: customChildModal.sendEmail ? '#166534' : '#6b7280', marginTop: '1px' }}>
                    Attach compiled invoice PDF and send to client
                  </div>
                </div>

                {/* Toggle Switch */}
                <div style={{
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: customChildModal.sendEmail ? '#16a34a' : '#cbd5e1',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    position: 'absolute',
                    top: '3px',
                    left: customChildModal.sendEmail ? '21px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ flex: 1, padding: '9px 0', fontSize: '13px', justifyContent: 'center' }}
                  onClick={() => setCustomChildModal(prev => ({ ...prev, visible: false, masterInvoice: null }))}
                  disabled={customChildModal.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className={styles.btnPrimary}
                  style={{ flex: 2, padding: '9px 0', fontSize: '13px', fontWeight: 600, justifyContent: 'center' }}
                  onClick={handleCreateCustomChildSubmit}
                  disabled={customChildModal.isSubmitting}
                >
                  {customChildModal.isSubmitting ? 'Creating & Sending...' : 'Create Custom Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default Component;
