import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Req,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CurrentUser } from '../auth';
import { AccessController } from '../permission';
import { MailSender } from '../mail';
import { Renderers } from '../../mails';
import { ServerService } from '../config';
import { ProposalCopilotService } from './proposal-copilot.service';
import { Doc as YDoc, applyUpdate } from 'yjs';
import puppeteer from 'puppeteer';
import YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

export function applyAdminCompanyProfileToHtml(html: string, serverSettings?: any, dataObj?: any): string {
  if (!html) return html;

  const src =
    dataObj?.cover?.presented_by ||
    dataObj?.cover?.prepared_by ||
    dataObj?.company ||
    {};

  const hasSavedCompany = Boolean(
    src.company_name ||
    src.company ||
    src.name ||
    dataObj?.company?.name
  );

  const compName = (hasSavedCompany ? (src.company_name || src.company || src.name) : undefined) ||
    serverSettings?.company?.name || serverSettings?.companyName || serverSettings?.name || 'IntoAI Technologies Pvt Ltd';
  const compTagline = (hasSavedCompany ? src.tagline : undefined) ||
    serverSettings?.company?.tagline || serverSettings?.companyTagline || 'Enterprise AI Research & Solutions';
  const compEmail = (hasSavedCompany ? src.email : undefined) ||
    serverSettings?.company?.email || serverSettings?.email || serverSettings?.companyMail || 'connect@intoai.ai';
  const compPhone = (hasSavedCompany ? src.phone : undefined) ||
    serverSettings?.company?.phone || serverSettings?.phone || '+91 7510711617';
  const compAddress = (hasSavedCompany ? src.address : undefined) ||
    serverSettings?.company?.address || serverSettings?.address || 'No.472/7 Balaji Arcade, 2nd & 3rd Floor, A.V.S. Compound, 20th L Cross Road, Koramangala 4th Block, Bangalore, India — 560095';
  let compWeb = (hasSavedCompany ? (src.website || src.website_url) : undefined) ||
    serverSettings?.company?.websiteUrl || serverSettings?.websiteUrl || 'https://www.intoai.ai';
  const cleanWeb = compWeb.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const cin = (hasSavedCompany ? src.cin : undefined) ||
    serverSettings?.company?.cin || serverSettings?.cin || 'U72900KA2023PTC174829';
  const pan = (hasSavedCompany ? src.pan : undefined) ||
    serverSettings?.company?.pan || serverSettings?.pan || 'AAACI4567B';
  const gstin = (hasSavedCompany ? (src.gst || src.gstin) : undefined) ||
    serverSettings?.company?.gstin || serverSettings?.gstin || '29AAACI4567B1Z4';

  const regInfo = `CIN: ${cin} · PAN: ${pan}`;
  const gstInfo = `${compName} GSTIN: ${gstin}`;

  let updated = html;

  // 1. Company Name & Tagline
  updated = updated.replace(/<span class="brand-name">[\s\S]*?<\/span>/gi, `<span class="brand-name">${compName}</span>`);
  updated = updated.replace(/<span class="header-brand-name">[\s\S]*?<\/span>/gi, `<span class="header-brand-name">${compName}</span>`);
  updated = updated.replace(/<span class="brand-sub">[\s\S]*?<\/span>/gi, `<span class="brand-sub">${compTagline}</span>`);
  updated = updated.replace(/<div class="brand-name">[\s\S]*?<\/div>/gi, `<div class="brand-name">${compName}</div>`);
  updated = updated.replace(/<div class="brand-sub">[\s\S]*?<\/div>/gi, `<div class="brand-sub">${compTagline}</div>`);
  updated = updated.replace(/<div class="sig-signer-company">IntoAI Technologies Pvt Ltd<\/div>/gi, `<div class="sig-signer-company">${compName}</div>`);
  updated = updated.replace(/This receipt confirms that [^<]*? has successfully received/gi, `This receipt confirms that ${compName} has successfully received`);

  // 2. Company Contact Block (Address, Email, Web, Phone)
  const formattedAddressLines = compAddress.split('\n').map((l: string) => l.trim()).filter(Boolean);
  let addressHtml = '';
  if (formattedAddressLines.length > 0) {
    addressHtml = formattedAddressLines.map((line: string) => `<p>${line}</p>`).join('\n              ');
  } else {
    addressHtml = `<p>${compAddress}</p>`;
  }

  const contactBlockHtml = `<div class="company-contact">
              ${addressHtml}
              <p><span>Email:</span> ${compEmail} &nbsp;|&nbsp; <span>Web:</span> ${cleanWeb} &nbsp;|&nbsp; <span>Phone:</span> ${compPhone}</p>
            </div>`;

  updated = updated.replace(/<div class="company-contact">[\s\S]*?<\/div>/gi, contactBlockHtml);

  // 3. Footer Company Legal Info & Placeholders
  updated = updated.replace(/\{\{company\.reg_info\}\}/gi, regInfo);
  updated = updated.replace(/\{\{company\.gst_info\}\}/gi, gstInfo);
  updated = updated.replace(/\{\{company\.name\}\}/gi, compName);
  updated = updated.replace(/\{\{company\.address\}\}/gi, compAddress);
  updated = updated.replace(/\{\{company\.email\}\}/gi, compEmail);
  updated = updated.replace(/\{\{company\.phone\}\}/gi, compPhone);
  updated = updated.replace(/\{\{company\.web\}\}/gi, cleanWeb);
  updated = updated.replace(/\{\{company\.website\}\}/gi, compWeb);
  updated = updated.replace(/\{\{company\.cin\}\}/gi, cin);
  updated = updated.replace(/\{\{company\.pan\}\}/gi, pan);
  updated = updated.replace(/\{\{company\.gst\}\}/gi, gstin);
  updated = updated.replace(/\{\{company\.gstin\}\}/gi, gstin);

  // 4. Update data-company-field attributes
  updated = updated.replace(/<span([^>]*data-company-field="company\.name"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${compName}</span>`);
  updated = updated.replace(/<span([^>]*data-company-field="company\.tagline"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${compTagline}</span>`);
  updated = updated.replace(/<span([^>]*data-company-field="company\.cin"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${cin}</span>`);
  updated = updated.replace(/<span([^>]*data-company-field="company\.pan"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${pan}</span>`);
  updated = updated.replace(/<span([^>]*data-company-field="company\.gstin"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${gstin}</span>`);
  updated = updated.replace(/<span([^>]*data-company-field="company\.reg_info"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${regInfo}</span>`);
  updated = updated.replace(/<span([^>]*data-company-field="company\.gst_info"[^>]*)>[\s\S]*?<\/span>/gi, `<span$1>${gstInfo}</span>`);
  updated = updated.replace(/IntoAI Confidential/gi, `${compName} Confidential`);

  return updated;
}

export function inlineLocalAssets(html: string, serverSettings?: any): string {
  let result = html;
  const publicDirs = [
    path.join(process.cwd(), '../../frontend/core/public'),
    path.join(process.cwd(), '../frontend/core/public'),
    path.join(process.cwd(), 'packages/frontend/core/public'),
    path.join(process.cwd(), 'public'),
  ];

  function findFile(fileName: string): string | null {
    const cleanName = fileName.split('?')[0].replace(/^\//, '');
    for (const dir of publicDirs) {
      const fullPath = path.join(dir, cleanName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  // Replace <link ... href="...css..." ...> with <style>...</style>
  result = result.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
    const filePath = findFile(href);
    if (filePath) {
      try {
        const cssContent = fs.readFileSync(filePath, 'utf8');
        return `<style>/* inlined ${href} */\n${cssContent}</style>`;
      } catch (e) {}
    }
    return match;
  });

  result = result.replace(/<link\s+[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*rel=["']stylesheet["'][^>]*>/gi, (match, href) => {
    const filePath = findFile(href);
    if (filePath) {
      try {
        const cssContent = fs.readFileSync(filePath, 'utf8');
        return `<style>/* inlined ${href} */\n${cssContent}</style>`;
      } catch (e) {}
    }
    return match;
  });

  // Resolve dynamic Company Logo from Admin Settings (companyLogoUrl, companyLogoData, oneLogoData)
  let resolvedLogoSrc = '';
  if (serverSettings) {
    if (
      serverSettings.companyLogoUrl &&
      typeof serverSettings.companyLogoUrl === 'string' &&
      serverSettings.companyLogoUrl.trim().length > 0 &&
      serverSettings.companyLogoUrl.trim() !== 'CompanyLogo.png'
    ) {
      resolvedLogoSrc = serverSettings.companyLogoUrl.trim();
    } else if (
      serverSettings.companyLogoData &&
      typeof serverSettings.companyLogoData === 'string' &&
      serverSettings.companyLogoData.trim().length > 0
    ) {
      resolvedLogoSrc = serverSettings.companyLogoData.trim();
    } else if (
      serverSettings.oneLogoData &&
      typeof serverSettings.oneLogoData === 'string' &&
      serverSettings.oneLogoData.trim().length > 0
    ) {
      resolvedLogoSrc = serverSettings.oneLogoData.trim();
    }
  }

  // Fallback to local CompanyLogo.png file converted to Base64
  if (!resolvedLogoSrc) {
    const filePath = findFile('CompanyLogo.png');
    if (filePath) {
      try {
        const imgBuffer = fs.readFileSync(filePath);
        resolvedLogoSrc = `data:image/png;base64,${imgBuffer.toString('base64')}`;
      } catch (e) {}
    }
  }

  if (resolvedLogoSrc) {
    result = result.replace(/src=["'][^"']*CompanyLogo[^"']*["']/gi, `src="${resolvedLogoSrc}"`);
    result = result.replace(/(<img[^>]*class=["'][^"']*(logo|brand|cover-logo-img)[^"']*["'][^>]*)src=["'][^"']*["']/gi, `$1src="${resolvedLogoSrc}"`);
  }

  // Apply complete Admin Company Details
  result = applyAdminCompanyProfileToHtml(result, serverSettings);

  return result;
}

export function isDueDatePassed(dueDateStr?: string | null): boolean {
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

export function injectInvoiceData(templateHtml: string, dataObj: any, serverSettings?: any): string {
  if (!templateHtml) return '';

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

  let rawStatus = dataObj.metadata?.status || 'Unpaid';
  const rawDueDate = dataObj.metadata?.due_date;
  if (rawStatus.toLowerCase() === 'overdue' && rawDueDate && !isDueDatePassed(rawDueDate)) {
    rawStatus = 'Unpaid';
  } else if (rawStatus.toLowerCase() === 'unpaid' && rawDueDate && isDueDatePassed(rawDueDate)) {
    rawStatus = 'Overdue';
  }
  const isPaid = rawStatus.toLowerCase() === 'paid';
  const isOverdue = rawStatus.toLowerCase() === 'overdue';
  const statusClass = isPaid ? 'paid' : isOverdue ? 'overdue' : 'unpaid';

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

  let rendered = templateHtml;

  const loopRegex = /\{\{#invoice\.items\}\}([\s\S]*?)\{\{\/invoice\.items\}\}/g;
  const loopMatch = loopRegex.exec(rendered);
  if (loopMatch) {
    const rowTemplate = loopMatch[1];
    let rowsHtml = '';
    items.forEach((item: any, idx: number) => {
      const qty = parseFloat(item.qty || item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      const rateStr = currencySymbol + rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amtStr = currencySymbol + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let row = rowTemplate;
      row = row.replace('<tr>', `<tr data-index="${idx}">`);
      row = row.replace('01', String(idx + 1).padStart(2, '0'));
      row = row.replace('{{title}}', item.name || item.title || '[Enter Name]');
      row = row.replace('{{description}}', item.desc || item.description || '[Enter Description]');
      row = row.replace('{{quantity}}', String(qty));
      row = row.replace('{{rate}}', rateStr);
      row = row.replace('{{amount}}', `<span class="amount-col">${amtStr}</span>`);
      rowsHtml += row;
    });

    if (rowsHtml === '') {
      rowsHtml = `<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">No items configured.</td></tr>`;
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

  const bankBeneficiary = dataObj.payment?.bank_details?.beneficiary || dataObj.payment?.bank_details?.account_name || serverSettings?.company?.bankAccountName || serverSettings?.bankAccountName || serverSettings?.company?.name || serverSettings?.companyName || serverSettings?.name || 'IntoAI Technologies Pvt Ltd';
  const bankName = dataObj.payment?.bank_details?.bank_name || serverSettings?.company?.bankName || serverSettings?.bankName || 'ICICI Bank';
  const bankAccNo = dataObj.payment?.bank_details?.account_number || serverSettings?.company?.bankAccountNumber || serverSettings?.bankAccountNumber || '98765432101';
  const bankIfsc = dataObj.payment?.bank_details?.ifsc || serverSettings?.company?.bankIfsc || serverSettings?.bankIfsc || 'ICIC0000104';
  const bankBranch = dataObj.payment?.bank_details?.branch || serverSettings?.company?.bankBranch || serverSettings?.bankBranch || '';
  const bankUpi = dataObj.payment?.upi || serverSettings?.company?.upiId || serverSettings?.upiId || '';

  const cin = serverSettings?.company?.cin || serverSettings?.cin || 'U72900KA2023PTC174829';
  const pan = serverSettings?.company?.pan || serverSettings?.pan || 'AAACI4567B';
  const gstin = serverSettings?.company?.gstin || serverSettings?.gstin || '29AAACI4567B1Z4';
  const compName = serverSettings?.company?.name || serverSettings?.companyName || serverSettings?.name || 'IntoAI Technologies Pvt Ltd';

  const regInfo = `CIN: ${cin} · PAN: ${pan}`;
  const gstInfo = `${compName} GSTIN: ${gstin}`;

  const placeholdersMap: Record<string, string> = {
    '{{invoice.number}}': dataObj.metadata?.invoice_id || 'INV-0001',
    '{{invoice.id}}': dataObj.metadata?.invoice_id || 'INV-0001',
    '{{invoice.date}}': dataObj.metadata?.date || '',
    '{{invoice.due_date}}': dataObj.metadata?.due_date || '',
    '{{invoice.status}}': rawStatus,
    '{{invoice.status_class}}': statusClass,
    '{{invoice.version}}': dataObj.metadata?.version || '1.0',
    '{{invoice.subtotal}}': `<span class="invoice-subtotal-value">${subtotalStr}</span>`,
    '{{invoice.tax}}': `<span class="invoice-tax-value">${gstStr}</span>`,
    '{{invoice.total}}': `<span class="invoice-total-value">${totalStr}</span>`,
    '{{invoice.amount_paid}}': `<span class="invoice-amount-paid-value">${amountPaidStr}</span>`,
    '{{invoice.amount_due}}': `<span class="invoice-amount-due-value">${amountDueStr}</span>`,
    '{{invoice.final_label}}': finalLabel,
    '{{client.company_name}}': dataObj.cover?.prepared_for?.company_name || dataObj.client?.company || '[Client Company Name]',
    '{{client.contact_name}}': dataObj.cover?.prepared_for?.lead || dataObj.client?.name || '[Client Contact Name]',
    '{{client.address}}': dataObj.cover?.prepared_for?.address || dataObj.client?.address || '[Client Address]',
    '{{client.email}}': dataObj.cover?.prepared_for?.email || dataObj.client?.email || '[Client Email]',
    '{{client.phone}}': dataObj.cover?.prepared_for?.phone || dataObj.client?.phone || '[Client Phone]',
    '{{client.gst}}': dataObj.cover?.prepared_for?.gst || dataObj.client?.gst || '[Client GSTIN]',
    '{{project.name}}': dataObj.metadata?.short_title || '[Project Name]',
    '{{project.id}}': dataObj.metadata?.project_id || 'PROJ-INTOAI',
    '{{proposal.reference}}': dataObj.metadata?.proposal_id || 'None',
    '{{quote.reference}}': dataObj.metadata?.quote_id || 'None',
    '{{invoice.generated_date}}': dataObj.metadata?.date || '',
    '{{payment.beneficiary}}': bankBeneficiary,
    '{{payment.bank_name}}': bankName,
    '{{payment.account_number}}': bankAccNo,
    '{{payment.ifsc}}': bankIfsc,
    '{{payment.branch}}': bankBranch,
    '{{payment.upi}}': bankUpi,
    '{{company.reg_info}}': regInfo,
    '{{company.gst_info}}': gstInfo,
  };

  Object.entries(placeholdersMap).forEach(([k, v]) => {
    rendered = rendered.split(k).join(v);
  });

  rendered = applyAdminCompanyProfileToHtml(rendered, serverSettings, dataObj);

  return rendered;
}

function isOnlyStatusOrReceiptMetadataChange(oldYaml: string, newYaml: string): boolean {
  try {
    const oldDoc = YAML.parse(oldYaml);
    const newDoc = YAML.parse(newYaml);
    
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
    
    return JSON.stringify(oldClean) === JSON.stringify(newClean);
  } catch (e) {
    return false;
  }
}

export function prepareHtmlWithBaseHref(html: string, origin: string, serverSettings?: any): string {
  let effectiveOrigin = origin;
  if (effectiveOrigin.includes('one.intoai.ai') || process.env.NODE_ENV === 'production') {
    effectiveOrigin = 'http://127.0.0.1:3010';
  }

  let processedHtml = inlineLocalAssets(html, serverSettings);

  const hideEditingControlsStyle = `
    <style id="pdf-hide-editing-controls">
      @page {
        size: A4 portrait;
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #FFFFFF !important;
        width: 100% !important;
        min-height: 100% !important;
      }
      .page-container {
        padding: 0 !important;
        margin: 0 auto !important;
        align-items: center !important;
      }
      .page {
        margin: 0 auto !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        break-after: page !important;
        break-inside: avoid !important;
      }
      .editable-quote-field,
      .editable-proposal-field,
      .editable-invoice-field,
      .editable-letterhead-field {
        border: none !important;
        outline: none !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      .table-action-btn-col,
      .table-action-btn,
      .table-actions-footer,
      .list-actions-footer,
      .add-member-btn,
      .add-new-btn,
      .list-action-btn-col,
      .list-action-btn,
      .tuner-toggle-btn,
      .tuner-panel,
      .tuner-overlay,
      .tuner-handle,
      .tuner-marker,
      .hide-on-pdf {
        display: none !important;
      }
    </style>
  `;

  if (processedHtml.includes('</head>')) {
    processedHtml = processedHtml.replace('</head>', `${hideEditingControlsStyle}\n</head>`);
  } else {
    processedHtml = processedHtml + hideEditingControlsStyle;
  }

  // Decode or clean any Cloudflare email protection
  function decodeCfEmail(hex: string): string {
    try {
      let email = '';
      const k = parseInt(hex.substr(0, 2), 16);
      for (let n = 2; n < hex.length; n += 2) {
        email += String.fromCharCode(parseInt(hex.substr(n, 2), 16) ^ k);
      }
      return email;
    } catch {
      return '';
    }
  }

  processedHtml = processedHtml.replace(/<a[^>]*class="[^"]*__cf_email__[^"]*"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/a>/gi, (_m, hex) => {
    const dec = decodeCfEmail(hex);
    return (dec && dec.includes('@')) ? dec : 'connect@intoai.ai';
  });
  processedHtml = processedHtml.replace(/<span[^>]*class="[^"]*__cf_email__[^"]*"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>[\s\S]*?<\/span>/gi, (_m, hex) => {
    const dec = decodeCfEmail(hex);
    return (dec && dec.includes('@')) ? dec : 'connect@intoai.ai';
  });
  processedHtml = processedHtml.replace(/\[email&#160;protected\]/gi, 'connect@intoai.ai');
  processedHtml = processedHtml.replace(/\[email\s*protected\]/gi, 'connect@intoai.ai');

  if (processedHtml.includes('<base ')) {
    return processedHtml.replace(/<base\s+href="[^"]*"\s*\/?>/gi, `<base href="${effectiveOrigin}/">`);
  }
  if (processedHtml.includes('<head>')) {
    return processedHtml.replace('<head>', `<head>\n  <base href="${effectiveOrigin}/">`);
  }
  return `<base href="${effectiveOrigin}/">` + processedHtml;
}

export async function getWorkspaceBillingEmails(prisma: PrismaClient, workspaceId: string): Promise<{
  billingMailTo: string[];
  billingMailCc: string[];
  companyMail: string;
  companyName: string;
}> {
  const result = {
    billingMailTo: [] as string[],
    billingMailCc: [] as string[],
    companyMail: '',
    companyName: '',
  };

  try {
    const snapshot = await prisma.snapshot.findUnique({
      where: {
        workspaceId_id: {
          workspaceId,
          id: workspaceId,
        },
      },
    });

    const updates = await prisma.update.findMany({
      where: {
        workspaceId,
        id: workspaceId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const ydoc = new YDoc();
    if (snapshot?.blob) {
      applyUpdate(ydoc, snapshot.blob);
    }
    for (const u of updates) {
      applyUpdate(ydoc, u.blob);
    }

    if (ydoc.share.has('meta')) {
      const meta = ydoc.getMap('meta');
      const toStr = (meta.get('billingMailTo') as string) || '';
      const ccStr = (meta.get('billingMailCc') as string) || '';
      result.companyMail = (meta.get('companyMail') as string) || '';
      result.companyName = (meta.get('companyName') as string) || '';

      if (toStr) {
        toStr.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean).forEach(e => result.billingMailTo.push(e));
      }
      if (ccStr) {
        ccStr.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean).forEach(e => result.billingMailCc.push(e));
      }
    }
  } catch (e) {
    console.error('[getWorkspaceBillingEmails] Error parsing workspace meta:', e);
  }

  return result;
}

export function injectReceiptData(templateHtml: string, dataObj: any, serverSettings?: any): string {
  if (!templateHtml) return '';

  const items = dataObj.items || [];
  let subtotal = 0;
  items.forEach((item: any) => {
    const qty = parseFloat(item.qty || item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    subtotal += qty * rate;
  });

  const gstRate = parseFloat(dataObj.financials?.gst_rate) || 18;
  const total = subtotal * (1 + gstRate / 100);

  const currencySymbol = dataObj.metadata?.currency || '₹';
  const amountPaidVal = dataObj.payment?.amount_paid !== undefined ? parseFloat(dataObj.payment.amount_paid) : total;
  const amountPaidStr = currencySymbol + amountPaidVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const compEmail = serverSettings?.company?.email || serverSettings?.email || serverSettings?.companyMail || 'billing@intoai.ai';
  const notesText = dataObj.payment?.notes || dataObj.notes?.text || `Thank you for your business. For any payment inquiries, please write to ${compEmail}.`;

  let rendered = templateHtml;

  const notesRegex = /\{\{#receipt\.notes\}\}([\s\S]*?)\{\{\/receipt\.notes\}\}/g;
  if (notesText) {
    rendered = rendered.replace(notesRegex, (_match, innerHtml) => {
      return innerHtml.replace('{{receipt.notes}}', notesText);
    });
  } else {
    rendered = rendered.replace(notesRegex, '');
  }

  const cin = serverSettings?.company?.cin || serverSettings?.cin || 'U72900KA2023PTC174829';
  const pan = serverSettings?.company?.pan || serverSettings?.pan || 'AAACI4567B';
  const gstin = serverSettings?.company?.gstin || serverSettings?.gstin || '29AAACI4567B1Z4';
  const compName = serverSettings?.company?.name || serverSettings?.companyName || serverSettings?.name || 'IntoAI Technologies Pvt Ltd';

  const regInfo = `CIN: ${cin} · PAN: ${pan}`;
  const gstInfo = `${compName} GSTIN: ${gstin}`;

  const placeholdersMap: Record<string, string> = {
    '{{receipt.number}}': dataObj.payment?.receipt_number || `REC-${(dataObj.metadata?.invoice_id || '2026-000').replace('INV-', '')}`,
    '{{receipt.date}}': dataObj.payment?.date || dataObj.metadata?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{receipt.status}}': 'PAID',
    '{{receipt.status_class}}': 'paid',
    '{{client.company_name}}': dataObj.cover?.prepared_for?.company_name || dataObj.client?.company || '[Client Company Name]',
    '{{client.contact_name}}': dataObj.cover?.prepared_for?.lead || dataObj.client?.name || '[Client Contact Name]',
    '{{client.address}}': dataObj.cover?.prepared_for?.address || dataObj.client?.address || '[Client Address]',
    '{{client.email}}': dataObj.cover?.prepared_for?.email || dataObj.client?.email || '[Client Email]',
    '{{client.phone}}': dataObj.cover?.prepared_for?.phone || dataObj.client?.phone || '[Client Phone]',
    '{{payment.amount}}': amountPaidStr,
    '{{payment.date}}': dataObj.payment?.date || dataObj.metadata?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{payment.method}}': dataObj.payment?.method || 'Bank Transfer (NEFT/RTGS)',
    '{{payment.transaction_id}}': dataObj.payment?.transaction_id || 'TXN_' + Math.floor(1000000 + Math.random() * 9000000),
    '{{payment.gateway_ref}}': dataObj.payment?.gateway_ref || 'ICIC_RTGS_' + Math.floor(10000 + Math.random() * 90000),
    '{{project.name}}': dataObj.metadata?.short_title || '[Project Name]',
    '{{project.id}}': dataObj.metadata?.project_id || 'PROJ-INTOAI',
    '{{proposal.reference}}': dataObj.metadata?.proposal_id || 'None',
    '{{quote.reference}}': dataObj.metadata?.quote_id || 'None',
    '{{invoice.reference}}': dataObj.metadata?.invoice_id || 'None',
    '{{receipt.generated_date}}': dataObj.payment?.date || dataObj.metadata?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{company.reg_info}}': regInfo,
    '{{company.gst_info}}': gstInfo,
  };

  Object.entries(placeholdersMap).forEach(([k, v]) => {
    rendered = rendered.split(k).join(v);
  });

  rendered = applyAdminCompanyProfileToHtml(rendered, serverSettings, dataObj);

  return rendered;
}

import { CopilotGraphService, CopilotContextInput } from './copilot-graph.service';

@Controller('/api')
export class ProposalController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ac: AccessController,
    private readonly mailSender: MailSender,
    private readonly copilot: ProposalCopilotService,
    private readonly copilotGraph: CopilotGraphService,
    @Optional() private readonly serverService?: ServerService
  ) {}

  @Post('/copilot/chat')
  async copilotGraphChat(
    @CurrentUser() user: CurrentUser,
    @Body()
    body: {
      workspaceId: string;
      sessionId?: string;
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      context: CopilotContextInput;
    }
  ) {
    if (!body.workspaceId || !body.message) {
      throw new BadRequestException('workspaceId and message are required.');
    }
    await this.ac.user(user.id).workspace(body.workspaceId).assert('Workspace.Read');

    const activeSessionId = body.sessionId || `session_${Date.now()}`;

    // Save user message to database
    await (this.prisma as any).copilotChatMessage.create({
      data: {
        workspaceId: body.workspaceId,
        userId: user.id,
        sessionId: activeSessionId,
        role: 'user',
        content: body.message,
      },
    }).catch(() => {});

    const result = await this.copilotGraph.processCopilotRequest(
      body.workspaceId,
      body.message,
      body.history || [],
      body.context || { activeTab: 'projects' }
    );

    // Save assistant reply to database
    if (result && result.reply) {
      await (this.prisma as any).copilotChatMessage.create({
        data: {
          workspaceId: body.workspaceId,
          userId: user.id,
          sessionId: activeSessionId,
          role: 'assistant',
          content: result.reply,
          pendingAction: result.pendingAction || undefined,
        },
      }).catch(() => {});
    }

    return {
      ...result,
      sessionId: activeSessionId,
    };
  }

  @Get('/copilot/history')
  async getCopilotHistory(
    @CurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
    @Query('sessionId') targetSessionId?: string
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required.');
    }
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');

    const allMessages = await (this.prisma as any).copilotChatMessage.findMany({
      where: { workspaceId, userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    // Group messages into sessions
    const sessionMap = new Map<string, { id: string; title: string; updatedAt: any; messages: any[] }>();

    for (const msg of allMessages) {
      const sessId = msg.sessionId || 'default';
      if (!sessionMap.has(sessId)) {
        sessionMap.set(sessId, {
          id: sessId,
          title: msg.role === 'user' ? (msg.content.slice(0, 35) + (msg.content.length > 35 ? '...' : '')) : 'New Chat',
          updatedAt: msg.createdAt,
          messages: [],
        });
      }
      const sess = sessionMap.get(sessId)!;
      sess.messages.push(msg);
      sess.updatedAt = msg.createdAt;
      if (sess.title === 'New Chat' && msg.role === 'user') {
        sess.title = msg.content.slice(0, 35) + (msg.content.length > 35 ? '...' : '');
      }
    }

    const sessions = Array.from(sessionMap.values()).reverse(); // most recent sessions first

    let messages = allMessages;
    if (targetSessionId) {
      messages = allMessages.filter((m: any) => (m.sessionId || 'default') === targetSessionId);
    } else if (sessions.length > 0) {
      messages = sessions[0].messages;
    }

    return { messages, sessions };
  }

  @Delete('/copilot/history')
  async clearCopilotHistory(
    @CurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
    @Query('sessionId') targetSessionId?: string
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required.');
    }
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');

    const whereClause: any = { workspaceId, userId: user.id };
    if (targetSessionId) {
      whereClause.sessionId = targetSessionId;
    }

    await (this.prisma as any).copilotChatMessage.deleteMany({
      where: whereClause,
    });

    return { success: true };
  }

  @Post('/copilot/resolve-action')
  async resolveCopilotAction(
    @CurrentUser() user: CurrentUser,
    @Body()
    body: {
      workspaceId: string;
      sessionId: string;
      messageId?: string;
      action: string;
      data: Record<string, any>;
      status: 'executed' | 'cancelled';
      resultMessage?: string;
    }
  ) {
    if (!body.workspaceId || !body.sessionId) {
      throw new BadRequestException('workspaceId and sessionId are required.');
    }
    await this.ac.user(user.id).workspace(body.workspaceId).assert('Workspace.Read');

    // 1. Clear pendingAction from the specified or most recent message in this session
    if (body.messageId) {
      await (this.prisma as any).copilotChatMessage.updateMany({
        where: { id: body.messageId, workspaceId: body.workspaceId, userId: user.id },
        data: { pendingAction: null },
      }).catch(() => {});
    } else {
      const lastActionMsg = await (this.prisma as any).copilotChatMessage.findFirst({
        where: {
          workspaceId: body.workspaceId,
          userId: user.id,
          sessionId: body.sessionId,
          role: 'assistant',
          pendingAction: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (lastActionMsg) {
        await (this.prisma as any).copilotChatMessage.update({
          where: { id: lastActionMsg.id },
          data: { pendingAction: null },
        }).catch(() => {});
      }
    }

    // 2. Persist the execution summary / cancellation message
    if (body.resultMessage) {
      await (this.prisma as any).copilotChatMessage.create({
        data: {
          workspaceId: body.workspaceId,
          userId: user.id,
          sessionId: body.sessionId,
          role: 'assistant',
          content: body.resultMessage,
        },
      }).catch(() => {});
    }

    return { success: true };
  }

  // 1. List proposals for a workspace
  @Get('/workspaces/:workspaceId/proposals')
  async listProposals(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');

    const proposals = await this.prisma.workspaceProposal.findMany({
      where: { workspaceId },
      orderBy: { preparedDate: 'desc' },
    });

    return proposals;
  }

  // 1b. List projects for a workspace
  @Get('/workspaces/:workspaceId/projects')
  async listProjects(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. Get a specific proposal version
  @Get('/workspaces/:workspaceId/proposals/:proposalId/:version')
  async getProposal(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('proposalId') proposalId: string,
    @Param('version') version: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');

    const proposal = await this.prisma.workspaceProposal.findUnique({
      where: {
        workspaceId_proposalId_version: {
          workspaceId,
          proposalId,
          version,
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} version ${version} not found`);
    }

    return proposal;
  }

  // 3. Create or save a proposal (bumps version or updates existing if authorized via OTP)
  @Post('/workspaces/:workspaceId/proposals')
  async saveProposal(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      proposalId: string;
      version: string;
      title: string;
      preparedFor: string;
      preparedDate: string;
      content: string;
      projectIdConnect?: string;
      otpCode?: string;
    }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');

    const { proposalId, version, title, preparedFor, preparedDate, content, otpCode, projectIdConnect } = body;

    // Check if version already exists
    const existing = await this.prisma.workspaceProposal.findUnique({
      where: {
        workspaceId_proposalId_version: {
          workspaceId,
          proposalId,
          version,
        },
      },
    });

    if (existing) {
      // Overwriting an existing finalized proposal requires EditProposal OTP verification
      if (!otpCode) {
        throw new BadRequestException('Editing a finalized version requires an OTP code.');
      }

      const validOtp = await this.prisma.projectDocOtp.findFirst({
        where: {
          email: user.email,
          purpose: 'EditProposal',
          code: otpCode,
          expiresAt: { gt: new Date() },
        },
      });

      if (!validOtp) {
        throw new ForbiddenException('Invalid or expired OTP code for editing proposal.');
      }

      // Consume OTP
      await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

      // Update proposal
      return this.prisma.workspaceProposal.update({
        where: {
          workspaceId_proposalId_version: {
            workspaceId,
            proposalId,
            version,
          },
        },
        data: {
          title,
          preparedFor,
          preparedDate: new Date(preparedDate),
          content,
          projectIdConnect,
        },
      });
    }

    // Save as new version
    return this.prisma.workspaceProposal.create({
      data: {
        workspaceId,
        proposalId,
        version,
        title,
        preparedFor,
        preparedDate: new Date(preparedDate),
        content,
        projectIdConnect,
      },
    });
  }

  // 4. Delete a proposal version (Requires DeleteProposal OTP verification)
  @Delete('/workspaces/:workspaceId/proposals/:proposalId/:version')
  async deleteProposal(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('proposalId') proposalId: string,
    @Param('version') version: string,
    @Query('otpCode') otpCode?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');

    if (!otpCode) {
      throw new BadRequestException('Deleting a proposal requires an OTP code.');
    }

    const validOtp = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: user.email,
        purpose: 'DeleteProposal',
        code: otpCode,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      throw new ForbiddenException('Invalid or expired OTP code for deleting proposal.');
    }

    // Consume OTP
    await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

    return this.prisma.workspaceProposal.delete({
      where: {
        workspaceId_proposalId_version: {
          workspaceId,
          proposalId,
          version,
        },
      },
    });
  }

  // 5. Send OTP API
  @Post('/workspaces/:workspaceId/proposals/otp')
  async sendOtp(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { purpose: 'EditProposal' | 'DeleteProposal' }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new NotFoundException('User profile not found.');
    }

    const targetEmail = dbUser.companyMail || dbUser.email;
    if (!targetEmail) {
      throw new BadRequestException('No destination email address configured.');
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save in ProjectDocOtp table
    await this.prisma.projectDocOtp.create({
      data: {
        email: dbUser.email,
        code,
        expiresAt,
        purpose: body.purpose,
      },
    });

    // Send email with dedicated DocumentActionOtp template
    const isDelete = body.purpose === 'DeleteProposal';
    const emailData = await Renderers.DocumentActionOtp({
      title: isDelete ? 'Proposal Deletion Authorization' : 'Proposal Modification Authorization',
      actionDescription: isDelete
        ? 'Please enter the following one-time verification code to authorize deleting this proposal:'
        : 'Please enter the following one-time verification code to authorize saving changes to this proposal:',
      otp: code,
      userName: dbUser.name || undefined,
      expiresInMinutes: 5,
    });
    const mailSent = await this.mailSender.send('proposal-otp', {
      to: targetEmail,
      subject: isDelete
        ? `[IntoAI Workspace] Proposal Deletion Verification Code`
        : `[IntoAI Workspace] Proposal Authorization Code`,
      html: emailData.html,
    });

    if (!mailSent) {
      throw new BadRequestException('Failed to dispatch authorization email.');
    }

    return { success: true };
  }

  // 6. PDF Generation Endpoint
  @Post('/proposals/pdf')
  async generatePdf(
    @Body() body: { html: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!body.html) {
      throw new BadRequestException('HTML payload is missing.');
    }

    const originHeader = req.headers.origin as string;
    const refererHeader = req.headers.referer;
    let origin = 'http://localhost:8080';
    if (originHeader) {
      origin = originHeader;
    } else if (refererHeader) {
      try {
        origin = new URL(refererHeader).origin;
      } catch (e) {}
    }

    const htmlWithBase = prepareHtmlWithBaseHref(body.html, origin);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content',
        ],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');
      await page.evaluateHandle('document.fonts.ready').catch(() => {});

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: false,
      });


      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=proposal.pdf');
      res.send(pdfBuffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to generate PDF: ${e.message}`);
    }
  }

  // 7. AI Copilot endpoint
  @Post('/workspaces/:workspaceId/proposals/copilot')
  async executeCopilot(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { action: string; text: string; instructions?: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');

    const { action, text, instructions } = body;
    if (!action || !text) {
      throw new BadRequestException('Action and text are required parameters.');
    }

    const result = await this.copilot.executeCopilotAction(
      workspaceId,
      action,
      text,
      instructions
    );

    return { result };
  }

  // --- QUOTES ENDPOINTS ---

  @Get('/workspaces/:workspaceId/quotes')
  async listQuotes(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    return this.prisma.workspaceQuote.findMany({
      where: { workspaceId },
      orderBy: { preparedDate: 'desc' },
    });
  }

  @Get('/workspaces/:workspaceId/quotes/:quoteId/:version')
  async getQuote(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('quoteId') quoteId: string,
    @Param('version') version: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    const quote = await this.prisma.workspaceQuote.findUnique({
      where: {
        workspaceId_quoteId_version: {
          workspaceId,
          quoteId,
          version,
        },
      },
    });
    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} version ${version} not found`);
    }
    return quote;
  }

  @Post('/workspaces/:workspaceId/quotes')
  async saveQuote(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      quoteId: string;
      version: string;
      title: string;
      preparedFor: string;
      preparedDate: string;
      content: string;
      status: string;
      proposalIdConnect?: string;
      otpCode?: string;
    }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const { quoteId, version, title, preparedFor, preparedDate, content, status, proposalIdConnect, otpCode } = body;

    const existing = await this.prisma.workspaceQuote.findUnique({
      where: {
        workspaceId_quoteId_version: {
          workspaceId,
          quoteId,
          version,
        },
      },
    });

    if (existing) {
      const isMetadataOnly = isOnlyStatusOrReceiptMetadataChange(existing.content, content);
      if (!isMetadataOnly) {
        if (!otpCode) {
          throw new BadRequestException('Editing a finalized version requires an OTP code.');
        }
        const validOtp = await this.prisma.projectDocOtp.findFirst({
          where: {
            email: user.email,
            purpose: 'EditQuote',
            code: otpCode,
            expiresAt: { gt: new Date() },
          },
        });
        if (!validOtp) {
          throw new ForbiddenException('Invalid or expired OTP code.');
        }
        await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });
      }

      return this.prisma.workspaceQuote.update({
        where: {
          workspaceId_quoteId_version: {
            workspaceId,
            quoteId,
            version,
          },
        },
        data: {
          title,
          preparedFor,
          preparedDate: new Date(preparedDate),
          content,
          status,
          proposalIdConnect,
        },
      });
    }

    return this.prisma.workspaceQuote.create({
      data: {
        workspaceId,
        quoteId,
        version,
        title,
        preparedFor,
        preparedDate: new Date(preparedDate),
        content,
        status,
        proposalIdConnect,
      },
    });
  }

  @Delete('/workspaces/:workspaceId/quotes/:quoteId/:version')
  async deleteQuote(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('quoteId') quoteId: string,
    @Param('version') version: string,
    @Query('otpCode') otpCode?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!otpCode) {
      throw new BadRequestException('Deleting a quote requires an OTP code.');
    }
    const validOtp = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: user.email,
        purpose: 'DeleteQuote',
        code: otpCode,
        expiresAt: { gt: new Date() },
      },
    });
    if (!validOtp) {
      throw new ForbiddenException('Invalid or expired OTP code.');
    }
    await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

    return this.prisma.workspaceQuote.delete({
      where: {
        workspaceId_quoteId_version: {
          workspaceId,
          quoteId,
          version,
        },
      },
    });
  }

  @Post('/workspaces/:workspaceId/quotes/otp')
  async sendQuoteOtp(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { purpose: 'EditQuote' | 'DeleteQuote' }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundException('User not found.');
    const targetEmail = dbUser.companyMail || dbUser.email;
    if (!targetEmail) throw new BadRequestException('No destination email.');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.projectDocOtp.create({
      data: { email: dbUser.email, code, expiresAt, purpose: body.purpose },
    });
    const isDelete = body.purpose === 'DeleteQuote';
    const emailData = await Renderers.DocumentActionOtp({
      title: isDelete ? 'Quote Deletion Authorization' : 'Quote Modification Authorization',
      actionDescription: isDelete
        ? 'Please enter the following one-time verification code to authorize deleting this quotation:'
        : 'Please enter the following one-time verification code to authorize saving changes to this quotation:',
      otp: code,
      userName: dbUser.name || undefined,
      expiresInMinutes: 5,
    });
    const mailSent = await this.mailSender.send('quote-otp', {
      to: targetEmail,
      subject: isDelete
        ? `[IntoAI Workspace] Quote Deletion Verification Code`
        : `[IntoAI Workspace] Quote Authorization Code`,
      html: emailData.html,
    });
    if (!mailSent) throw new BadRequestException('Failed to send email.');
    return { success: true };
  }

  @Post('/quotes/pdf')
  async generateQuotePdf(
    @Body() body: { html: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!body.html) throw new BadRequestException('HTML payload is missing.');

    const originHeader = req.headers.origin as string;
    const refererHeader = req.headers.referer;
    let origin = 'http://localhost:8080';
    if (originHeader) {
      origin = originHeader;
    } else if (refererHeader) {
      try {
        origin = new URL(refererHeader).origin;
      } catch (e) {}
    }

    const htmlWithBase = prepareHtmlWithBaseHref(body.html, origin);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content',
        ],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');
      await page.evaluateHandle('document.fonts.ready').catch(() => {});
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: false,
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
      res.send(pdfBuffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to generate PDF: ${e.message}`);
    }
  }

  // --- INVOICES ENDPOINTS ---

  @Get('/workspaces/:workspaceId/invoices')
  async listInvoices(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    const invoices = await this.prisma.workspaceInvoice.findMany({
      where: { workspaceId },
      orderBy: { preparedDate: 'desc' },
    });

    return invoices.map(inv => {
      try {
        if (inv.status?.toLowerCase() === 'paid' || inv.isRecurringParent) return inv;
        const doc = YAML.parse(inv.content);
        const rawDueDate = doc?.metadata?.due_date;
        if (rawDueDate) {
          const effectiveStatus = isDueDatePassed(rawDueDate) ? 'Overdue' : 'Unpaid';
          if (effectiveStatus !== inv.status) {
            return { ...inv, status: effectiveStatus };
          }
        }
      } catch (_) {}
      return inv;
    });
  }

  @Get('/workspaces/:workspaceId/invoices/:invoiceId/:version')
  async getInvoice(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Param('version') version: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    const invoice = await this.prisma.workspaceInvoice.findUnique({
      where: {
        workspaceId_invoiceId_version: {
          workspaceId,
          invoiceId,
          version,
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} version ${version} not found`);
    }
    return invoice;
  }

  @Post('/workspaces/:workspaceId/invoices')
  async saveInvoice(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      invoiceId: string;
      version: string;
      title: string;
      preparedFor: string;
      preparedDate: string;
      content: string;
      status: string;
      quoteIdConnect?: string;
      proposalIdConnect?: string;
      otpCode?: string;
      // Recurring Invoices fields
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
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const {
      invoiceId,
      version,
      title,
      preparedFor,
      preparedDate,
      content,
      status,
      quoteIdConnect,
      proposalIdConnect,
      otpCode,
      isRecurring,
      isRecurringParent,
      parentInvoiceId,
      recurringFrequency,
      recurringStartDate,
      recurringNextDate,
      recurringCreatorId,
      recurringRecipient,
      recurringCc,
    } = body;

    const existing = await this.prisma.workspaceInvoice.findUnique({
      where: {
        workspaceId_invoiceId_version: {
          workspaceId,
          invoiceId,
          version,
        },
      },
    });

    const resolvedNextDate = isRecurring
      ? (recurringNextDate && String(recurringNextDate).trim()
          ? new Date(recurringNextDate)
          : (() => {
              const cleanFreq = recurringFrequency || 'monthly';
              const now = new Date();
              let targetYear = now.getFullYear();
              let targetMonth = now.getMonth();
              if (cleanFreq === 'monthly') targetMonth += 1;
              else if (cleanFreq === 'quarterly') targetMonth += 3;
              else if (cleanFreq === 'half_year') targetMonth += 6;
              else if (cleanFreq === 'year') targetYear += 1;
              else targetMonth += 1;
              if (targetMonth > 11) {
                targetYear += Math.floor(targetMonth / 12);
                targetMonth = targetMonth % 12;
              }
              const mm = String(targetMonth + 1).padStart(2, '0');
              return new Date(`${targetYear}-${mm}-01T00:00:00.000Z`);
            })())
      : null;

    let effectiveStatus = status;
    let effectiveContent = content;
    try {
      const doc = YAML.parseDocument(content);
      const metaStatus = String(doc.getIn(['metadata', 'status']) || status || 'Unpaid');
      const rawDueDate = doc.getIn(['metadata', 'due_date']);
      if (metaStatus.toLowerCase() === 'paid') {
        effectiveStatus = 'Paid';
      } else if (rawDueDate && !isRecurringParent) {
        if (!isDueDatePassed(String(rawDueDate))) {
          effectiveStatus = 'Unpaid';
          if (metaStatus.toLowerCase() === 'overdue') {
            doc.setIn(['metadata', 'status'], 'Unpaid');
            effectiveContent = doc.toString();
          }
        } else {
          effectiveStatus = 'Overdue';
          if (metaStatus.toLowerCase() === 'unpaid') {
            doc.setIn(['metadata', 'status'], 'Overdue');
            effectiveContent = doc.toString();
          }
        }
      }
    } catch (_) {}

    if (existing) {
      const isStatusChange = existing.status !== effectiveStatus;
      const isMetadataOnly = isOnlyStatusOrReceiptMetadataChange(existing.content, effectiveContent);
      if (!isMetadataOnly || isStatusChange) {
        if (!otpCode) {
          throw new BadRequestException('This operation requires an OTP code.');
        }
        const validOtp = await this.prisma.projectDocOtp.findFirst({
          where: {
            email: user.email,
            purpose: isStatusChange 
              ? { in: ['ChangeInvoiceStatus', 'EditInvoice'] }
              : 'EditInvoice',
            code: otpCode,
            expiresAt: { gt: new Date() },
          },
        });
        if (!validOtp) {
          throw new ForbiddenException('Invalid or expired OTP code.');
        }
        await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });
      }

      return this.prisma.workspaceInvoice.update({
        where: {
          workspaceId_invoiceId_version: {
            workspaceId,
            invoiceId,
            version,
          },
        },
        data: {
          title,
          preparedFor,
          preparedDate: new Date(preparedDate),
          content: effectiveContent,
          status: effectiveStatus,
          quoteIdConnect,
          proposalIdConnect,
          isRecurring: isRecurring ?? false,
          isRecurringParent: isRecurringParent ?? false,
          parentInvoiceId: parentInvoiceId || null,
          recurringFrequency: recurringFrequency || null,
          recurringStartDate: recurringStartDate ? new Date(recurringStartDate) : null,
          recurringNextDate: resolvedNextDate,
          recurringCreatorId: recurringCreatorId || null,
          recurringRecipient: recurringRecipient || null,
          recurringCc: recurringCc || null,
        },
      });
    }

    return this.prisma.workspaceInvoice.create({
      data: {
        workspaceId,
        invoiceId,
        version,
        title,
        preparedFor,
        preparedDate: new Date(preparedDate),
        content: effectiveContent,
        status: effectiveStatus,
        quoteIdConnect,
        proposalIdConnect,
        isRecurring: isRecurring ?? false,
        isRecurringParent: isRecurringParent ?? false,
        parentInvoiceId: parentInvoiceId || null,
        recurringFrequency: recurringFrequency || null,
        recurringStartDate: recurringStartDate ? new Date(recurringStartDate) : null,
        recurringNextDate: resolvedNextDate,
        recurringCreatorId: recurringCreatorId || null,
        recurringRecipient: recurringRecipient || null,
        recurringCc: recurringCc || null,
      },
    });
  }

  @Delete('/workspaces/:workspaceId/invoices/:invoiceId/:version')
  async deleteInvoice(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Param('version') version: string,
    @Query('otpCode') otpCode?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!otpCode) {
      throw new BadRequestException('Deleting an invoice requires an OTP code.');
    }
    const validOtp = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: user.email,
        purpose: 'DeleteInvoice',
        code: otpCode,
        expiresAt: { gt: new Date() },
      },
    });
    if (!validOtp) {
      throw new ForbiddenException('Invalid or expired OTP code.');
    }
    await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

    // Check if this invoice is a master recurring parent with existing sub-invoices
    const existing = await this.prisma.workspaceInvoice.findUnique({
      where: {
        workspaceId_invoiceId_version: {
          workspaceId,
          invoiceId,
          version,
        },
      },
    });

    if (existing?.isRecurringParent) {
      const subInvoicesCount = await this.prisma.workspaceInvoice.count({
        where: {
          workspaceId,
          parentInvoiceId: invoiceId,
        },
      });

      if (subInvoicesCount > 0) {
        throw new BadRequestException(
          'Cannot delete a recurring master template while active sub-invoices exist. Please delete all sub-invoices first.'
        );
      }
    }

    return this.prisma.workspaceInvoice.delete({
      where: {
        workspaceId_invoiceId_version: {
          workspaceId,
          invoiceId,
          version,
        },
      },
    });
  }

  @Post('/workspaces/:workspaceId/invoices/otp')
  async sendInvoiceOtp(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { purpose: 'EditInvoice' | 'DeleteInvoice' | 'ChangeInvoiceStatus' }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundException('User not found.');
    const targetEmail = dbUser.companyMail || dbUser.email;
    if (!targetEmail) throw new BadRequestException('No destination email.');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.projectDocOtp.create({
      data: { email: dbUser.email, code, expiresAt, purpose: body.purpose },
    });
    const isStatusChange = body.purpose === 'ChangeInvoiceStatus';
    const isDelete = body.purpose === 'DeleteInvoice';
    const title = isStatusChange
      ? 'Invoice Payment Status Authorization'
      : isDelete
        ? 'Invoice Deletion Authorization'
        : 'Invoice Modification Authorization';
    const actionDescription = isStatusChange
      ? 'Please enter the following one-time verification code to authorize updating the payment status for your commercial invoice:'
      : isDelete
        ? 'Please enter the following one-time verification code to authorize deleting this commercial invoice:'
        : 'Please enter the following one-time verification code to authorize saving changes to this commercial invoice:';
    const subject = isStatusChange
      ? `[IntoAI Workspace] Invoice Payment Status Verification Code`
      : isDelete
        ? `[IntoAI Workspace] Invoice Deletion Verification Code`
        : `[IntoAI Workspace] Invoice Authorization Code`;

    const emailData = await Renderers.DocumentActionOtp({
      title,
      actionDescription,
      otp: code,
      userName: dbUser.name || undefined,
      expiresInMinutes: 5,
    });
    const mailSent = await this.mailSender.send('invoice-otp', {
      to: targetEmail,
      subject,
      html: emailData.html,
    });
    if (!mailSent) throw new BadRequestException('Failed to send email.');
    return { success: true };
  }

  @Post('/invoices/pdf')
  async generateInvoicePdf(
    @Body() body: { html: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!body.html) throw new BadRequestException('HTML payload is missing.');

    const originHeader = req.headers.origin as string;
    const refererHeader = req.headers.referer;
    let origin = 'http://localhost:8080';
    if (originHeader) {
      origin = originHeader;
    } else if (refererHeader) {
      try {
        origin = new URL(refererHeader).origin;
      } catch (e) {}
    }

    const config = this.serverService?.getConfig() as any;
    const dbOverrides = this.serverService?.getDbOverrides() as any;
    const serverSettings = {
      ...(config?.server || {}),
      ...(dbOverrides?.server || {}),
      ...(config || {}),
      ...(dbOverrides || {}),
    };

    const htmlWithBase = prepareHtmlWithBaseHref(body.html, origin, serverSettings);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content',
        ],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');
      await page.evaluateHandle('document.fonts.ready').catch(() => {});
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: false,
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
      res.send(pdfBuffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to generate PDF: ${e.message}`);
    }
  }

  @Post('/workspaces/:workspaceId/invoices/send-recurring-email')
  async sendRecurringInvoiceEmail(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { invoiceId: string; version?: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');

    const invoiceId = body?.invoiceId;
    const version = body?.version;

    if (!invoiceId) {
      throw new BadRequestException('invoiceId is required.');
    }

    const inv = await this.prisma.workspaceInvoice.findFirst({
      where: {
        workspaceId,
        invoiceId,
        ...(version ? { version } : {}),
      },
      orderBy: { preparedDate: 'desc' },
    });

    if (!inv) {
      throw new NotFoundException(`Invoice ${invoiceId} not found in workspace.`);
    }

    let parentInv: any = null;
    if (inv.parentInvoiceId) {
      parentInv = await this.prisma.workspaceInvoice.findFirst({
        where: {
          workspaceId,
          invoiceId: inv.parentInvoiceId,
          isRecurringParent: true,
        },
      });
    }

    let templateHtml = '';
    const pathsToTry = [
      path.join(process.cwd(), '../../frontend/core/public/invoice_template.html'),
      path.join(process.cwd(), '../frontend/core/public/invoice_template.html'),
      path.join(process.cwd(), 'packages/frontend/core/public/invoice_template.html'),
      path.join(process.cwd(), 'public/invoice_template.html'),
    ];
    for (const p of pathsToTry) {
      try {
        if (fs.existsSync(p)) {
          templateHtml = fs.readFileSync(p, 'utf8');
          break;
        }
      } catch (e) {}
    }

    if (!templateHtml) {
      throw new BadRequestException('invoice_template.html could not be located.');
    }

    const config = this.serverService?.getConfig() as any;
    const dbOverrides = this.serverService?.getDbOverrides() as any;
    const serverSettings = {
      ...(config?.server || {}),
      ...(dbOverrides?.server || {}),
      ...(config || {}),
      ...(dbOverrides || {}),
    };

    const companyEmail: string =
      serverSettings.company?.email ||
      serverSettings.email ||
      serverSettings.companyMail ||
      'connect@intoai.ai';

    const companyName: string =
      serverSettings.company?.name ||
      serverSettings.companyName ||
      'IntoAI Technologies Pvt. Ltd.';

    const doc = YAML.parse(inv.content);
    const html = injectInvoiceData(templateHtml, doc, serverSettings);
    const origin = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:3010' : 'http://localhost:8080';
    const htmlWithBase = prepareHtmlWithBaseHref(html, origin, serverSettings);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
        '--allow-running-insecure-content',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    await page.emulateMediaType('screen');
    await page.evaluateHandle('document.fonts.ready').catch(() => {});
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      displayHeaderFooter: false,
    });
    await browser.close();

    const items = doc.items || [];
    let subtotal = 0;
    items.forEach((item: any) => {
      const qty = parseFloat(item.qty || item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      subtotal += qty * rate;
    });
    const gstRate = parseFloat(doc.financials?.gst_rate) || 18;
    const gst = subtotal * (gstRate / 100);
    const total = subtotal + gst;
    const totalStr = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function isDeliverableEmail(email?: string | null): boolean {
      if (!email) return false;
      const clean = email.trim().toLowerCase();
      if (!clean.includes('@') || clean.includes(' ') || clean.length < 5) return false;
      const domain = clean.split('@')[1] || '';
      if (!domain.includes('.')) return false;
      if (
        domain === 'example.com' ||
        domain === 'example.org' ||
        domain === 'test.com' ||
        domain.endsWith('.example') ||
        clean.includes('[') ||
        clean.includes('email protected')
      ) {
        return false;
      }
      return true;
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    const loggedInEmail = userRecord?.email || user.email;

    const configuredTo = parentInv?.recurringRecipient || inv.recurringRecipient || '';
    const configuredCc = parentInv?.recurringCc || inv.recurringCc || '';
    const clientEmail = doc.cover?.prepared_for?.email || doc.client?.email || '';

    const toSet = new Set<string>();
    const ccSet = new Set<string>();

    configuredTo.split(/[,;\s]+/).map((e: string) => e.trim()).filter(isDeliverableEmail).forEach((e: string) => toSet.add(e));
    if (isDeliverableEmail(clientEmail)) {
      toSet.add(clientEmail.trim());
    }
    if (toSet.size === 0 && isDeliverableEmail(loggedInEmail)) {
      toSet.add(loggedInEmail);
    }

    configuredCc.split(/[,;\s]+/).map((e: string) => e.trim()).filter(isDeliverableEmail).forEach((e: string) => {
      if (!toSet.has(e)) ccSet.add(e);
    });
    if (isDeliverableEmail(loggedInEmail) && !toSet.has(loggedInEmail)) {
      ccSet.add(loggedInEmail);
    }

    if (toSet.size === 0) {
      toSet.add(companyEmail);
    }

    const toList = Array.from(toSet);
    const ccList = Array.from(ccSet);

    let resolvedWorkspaceName = '';
    try {
      const wsRecord = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      if (wsRecord?.name && wsRecord.name.trim()) {
        resolvedWorkspaceName = wsRecord.name.trim();
      }
    } catch (e) {}

    const formattedDate = doc.metadata?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedDueDate = doc.metadata?.due_date || 'N/A';

    const renderedMail = await Renderers.RecurringInvoice({
      invoiceId: inv.invoiceId,
      invoiceTitle: inv.title || 'Commercial Invoice',
      workspaceName: resolvedWorkspaceName,
      clientName: inv.preparedFor || doc.cover?.prepared_for?.company_name || 'Valued Client',
      issueDate: formattedDate,
      dueDate: formattedDueDate,
      billingInterval: parentInv?.recurringFrequency || 'monthly',
      totalAmount: totalStr,
      status: 'Unpaid / Pending Payment',
      companyName,
      companyEmail,
    });

    const mailSent = await this.mailSender.send('RecurringInvoice', {
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      subject: renderedMail.subject,
      html: renderedMail.html,
      attachments: [
        {
          filename: `${inv.invoiceId}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return {
      success: mailSent !== false,
      message: `Invoice email dispatched to ${toList.join(', ')}${ccList.length > 0 ? ` (cc: ${ccList.join(', ')})` : ''}`,
    };
  }

  @Post('/workspaces/:workspaceId/invoices/send-receipt-email')
  async sendPaymentReceiptEmail(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { invoiceId: string; version?: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');

    const invoiceId = body?.invoiceId;
    const version = body?.version;

    if (!invoiceId) {
      throw new BadRequestException('invoiceId is required.');
    }

    const inv = await this.prisma.workspaceInvoice.findFirst({
      where: {
        workspaceId,
        invoiceId,
        ...(version ? { version } : {}),
      },
      orderBy: { preparedDate: 'desc' },
    });

    if (!inv) {
      throw new NotFoundException(`Invoice ${invoiceId} not found in workspace.`);
    }

    let templateHtml = '';
    const pathsToTry = [
      path.join(process.cwd(), '../../frontend/core/public/receipt_template.html'),
      path.join(process.cwd(), '../frontend/core/public/receipt_template.html'),
      path.join(process.cwd(), 'packages/frontend/core/public/receipt_template.html'),
      path.join(process.cwd(), 'public/receipt_template.html'),
    ];
    for (const p of pathsToTry) {
      try {
        if (fs.existsSync(p)) {
          templateHtml = fs.readFileSync(p, 'utf8');
          break;
        }
      } catch (e) {}
    }

    if (!templateHtml) {
      throw new BadRequestException('receipt_template.html could not be located.');
    }

    const config = this.serverService?.getConfig() as any;
    const dbOverrides = this.serverService?.getDbOverrides() as any;
    const serverSettings = {
      ...(config?.server || {}),
      ...(dbOverrides?.server || {}),
      ...(config || {}),
      ...(dbOverrides || {}),
    };

    const companyContactEmail: string =
      serverSettings.company?.email ||
      serverSettings.email ||
      serverSettings.companyMail ||
      'connect@intoai.ai';

    const companyName: string =
      serverSettings.company?.name ||
      serverSettings.companyName ||
      'IntoAI Technologies Pvt. Ltd.';

    const doc = YAML.parse(inv.content);
    const html = injectReceiptData(templateHtml, doc, serverSettings);
    const origin = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:3010' : 'http://localhost:8080';
    const htmlWithBase = prepareHtmlWithBaseHref(html, origin, serverSettings);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-certificate-errors',
        '--allow-running-insecure-content',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    await page.emulateMediaType('screen');
    await page.evaluateHandle('document.fonts.ready').catch(() => {});
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      displayHeaderFooter: false,
    });
    await browser.close();

    function isDeliverableEmail(email?: string | null): boolean {
      if (!email) return false;
      const clean = email.trim().toLowerCase();
      if (!clean.includes('@') || clean.includes(' ') || clean.length < 5) return false;
      const domain = clean.split('@')[1] || '';
      if (!domain.includes('.')) return false;
      if (
        domain === 'example.com' ||
        domain === 'example.org' ||
        domain === 'test.com' ||
        domain.endsWith('.example') ||
        clean.includes('[') ||
        clean.includes('email protected')
      ) {
        return false;
      }
      return true;
    }

    const wsBilling = await getWorkspaceBillingEmails(this.prisma, workspaceId);

    const toSet = new Set<string>();
    const ccSet = new Set<string>();

    wsBilling.billingMailTo.filter(isDeliverableEmail).forEach((e: string) => toSet.add(e));

    const clientEmail = doc.cover?.prepared_for?.email || doc.client?.email || wsBilling.companyMail || '';
    if (toSet.size === 0 && isDeliverableEmail(clientEmail)) {
      toSet.add(clientEmail.trim());
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    const loggedInEmail = userRecord?.email || user.email;
    if (toSet.size === 0 && isDeliverableEmail(loggedInEmail)) {
      toSet.add(loggedInEmail);
    }

    wsBilling.billingMailCc.filter(isDeliverableEmail).forEach((e: string) => {
      if (!toSet.has(e)) ccSet.add(e);
    });

    if (isDeliverableEmail(companyContactEmail) && !toSet.has(companyContactEmail)) {
      ccSet.add(companyContactEmail);
    }

    if (isDeliverableEmail(loggedInEmail) && !toSet.has(loggedInEmail)) {
      ccSet.add(loggedInEmail);
    }

    if (toSet.size === 0) {
      toSet.add(companyContactEmail);
    }

    const toList = Array.from(toSet);
    const ccList = Array.from(ccSet);

    let resolvedWorkspaceName = wsBilling.companyName || '';
    if (!resolvedWorkspaceName) {
      try {
        const wsRecord = await this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { name: true },
        });
        if (wsRecord?.name && wsRecord.name.trim()) {
          resolvedWorkspaceName = wsRecord.name.trim();
        }
      } catch (e) {}
    }

    const items = doc.items || [];
    let subtotal = 0;
    items.forEach((item: any) => {
      const qty = parseFloat(item.qty || item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      subtotal += qty * rate;
    });
    const gstRate = parseFloat(doc.financials?.gst_rate) || 18;
    const total = subtotal * (1 + gstRate / 100);
    const currencySymbol = doc.metadata?.currency || '₹';
    const amountPaidVal = doc.payment?.amount_paid !== undefined ? parseFloat(doc.payment.amount_paid) : total;
    const amountPaidStr = currencySymbol + amountPaidVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const recNumber = doc.payment?.receipt_number || `REC-${inv.invoiceId.replace('INV-', '')}`;
    const recDate = doc.payment?.date || doc.metadata?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const renderedMail = await Renderers.PaymentReceipt({
      receiptNumber: recNumber,
      invoiceId: inv.invoiceId,
      invoiceTitle: inv.title || 'Commercial Invoice',
      workspaceName: resolvedWorkspaceName,
      clientName: inv.preparedFor || doc.cover?.prepared_for?.company_name || 'Valued Client',
      amountPaid: amountPaidStr,
      paymentDate: recDate,
      paymentMethod: doc.payment?.method || 'Bank Transfer',
      transactionId: doc.payment?.transaction_id || undefined,
      companyName,
      companyEmail: companyContactEmail,
    });

    const mailSent = await this.mailSender.send('PaymentReceipt', {
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      subject: renderedMail.subject,
      html: renderedMail.html,
      attachments: [
        {
          filename: `${recNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return {
      success: mailSent !== false,
      message: `Payment receipt email dispatched to ${toList.join(', ')}${ccList.length > 0 ? ` (cc: ${ccList.join(', ')})` : ''}`,
    };
  }

  @Post('/receipts/pdf')
  async generateReceiptPdf(
    @Body() body: { html: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!body.html) throw new BadRequestException('HTML payload is missing.');

    const originHeader = req.headers.origin as string;
    const refererHeader = req.headers.referer;
    let origin = 'http://localhost:8080';
    if (originHeader) {
      origin = originHeader;
    } else if (refererHeader) {
      try {
        origin = new URL(refererHeader).origin;
      } catch (e) {}
    }

    const config = this.serverService?.getConfig() as any;
    const dbOverrides = this.serverService?.getDbOverrides() as any;
    const serverSettings = {
      ...(config?.server || {}),
      ...(dbOverrides?.server || {}),
      ...(config || {}),
      ...(dbOverrides || {}),
    };

    const htmlWithBase = prepareHtmlWithBaseHref(body.html, origin, serverSettings);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content',
        ],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');
      await page.evaluateHandle('document.fonts.ready').catch(() => {});
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: false,
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=receipt.pdf');
      res.send(pdfBuffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to generate PDF: ${e.message}`);
    }
  }

  // --- LETTERHEADS ENDPOINTS ---

  @Get('/workspaces/:workspaceId/letterheads')
  async listLetterheads(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    return this.prisma.workspaceLetterhead.findMany({
      where: { workspaceId },
      orderBy: { preparedDate: 'desc' },
    });
  }

  @Get('/workspaces/:workspaceId/letterheads/:letterheadId')
  async getLetterhead(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('letterheadId') letterheadId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    const letterhead = await this.prisma.workspaceLetterhead.findUnique({
      where: {
        workspaceId_letterheadId: {
          workspaceId,
          letterheadId,
        },
      },
    });
    if (!letterhead) {
      throw new NotFoundException(`Letterhead ${letterheadId} not found`);
    }
    return letterhead;
  }

  @Post('/workspaces/:workspaceId/letterheads')
  async saveLetterhead(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      letterheadId: string;
      title: string;
      preparedDate: string;
      content: string;
      authorizedDocUrl?: string;
    }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const { letterheadId, title, preparedDate, content, authorizedDocUrl } = body;

    const existing = await this.prisma.workspaceLetterhead.findUnique({
      where: {
        workspaceId_letterheadId: {
          workspaceId,
          letterheadId,
        },
      },
    });

    if (existing) {
      return this.prisma.workspaceLetterhead.update({
        where: {
          workspaceId_letterheadId: {
            workspaceId,
            letterheadId,
          },
        },
        data: {
          title,
          preparedDate: new Date(preparedDate),
          content,
          authorizedDocUrl: authorizedDocUrl ?? existing.authorizedDocUrl,
        },
      });
    }

    return this.prisma.workspaceLetterhead.create({
      data: {
        workspaceId,
        letterheadId,
        title,
        preparedDate: new Date(preparedDate),
        content,
        authorizedDocUrl: authorizedDocUrl ?? '',
      },
    });
  }

  @Delete('/workspaces/:workspaceId/letterheads/:letterheadId')
  async deleteLetterhead(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('letterheadId') letterheadId: string,
    @Query('otpCode') otpCode?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!otpCode) {
      throw new BadRequestException('Deleting a letterhead requires an OTP code.');
    }
    const validOtp = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: user.email,
        purpose: 'DeleteLetterhead',
        code: otpCode,
        expiresAt: { gt: new Date() },
      },
    });
    if (!validOtp) {
      throw new ForbiddenException('Invalid or expired OTP code.');
    }
    await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

    return this.prisma.workspaceLetterhead.delete({
      where: {
        workspaceId_letterheadId: {
          workspaceId,
          letterheadId,
        },
      },
    });
  }

  @Post('/workspaces/:workspaceId/letterheads/otp')
  async sendLetterheadOtp(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { purpose: 'DeleteLetterhead' }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundException('User not found.');
    const targetEmail = dbUser.companyMail || dbUser.email;
    if (!targetEmail) throw new BadRequestException('No destination email.');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.projectDocOtp.create({
      data: { email: dbUser.email, code, expiresAt, purpose: body.purpose },
    });
    const emailData = await Renderers.DocumentActionOtp({
      title: 'Letterhead Deletion Authorization',
      actionDescription: 'Please enter the following one-time verification code to authorize deleting this letterhead:',
      otp: code,
      userName: dbUser.name || undefined,
      expiresInMinutes: 5,
    });
    const mailSent = await this.mailSender.send('letterhead-otp', {
      to: targetEmail,
      subject: `[IntoAI Workspace] Letterhead Deletion Verification Code`,
      html: emailData.html,
    });
    if (!mailSent) throw new BadRequestException('Failed to send email.');
    return { success: true };
  }

  @Post('/letterheads/pdf')
  async generateLetterheadPdf(
    @Body() body: { html: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!body.html) throw new BadRequestException('HTML payload is missing.');

    const originHeader = req.headers.origin as string;
    const refererHeader = req.headers.referer;
    let origin = 'http://localhost:8080';
    if (originHeader) {
      origin = originHeader;
    } else if (refererHeader) {
      try {
        origin = new URL(refererHeader).origin;
      } catch (e) {}
    }

    const htmlWithBase = prepareHtmlWithBaseHref(body.html, origin);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--ignore-certificate-errors',
          '--allow-running-insecure-content',
        ],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      await page.setContent(htmlWithBase, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');
      await page.evaluateHandle('document.fonts.ready').catch(() => {});
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: false,
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=letterhead.pdf');
      res.send(pdfBuffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to generate PDF: ${e.message}`);
    }
  }
}

