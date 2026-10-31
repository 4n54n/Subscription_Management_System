import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { MailSender } from '../mail';
import { Renderers } from '../../mails';
import { ServerService } from '../config';
import { prepareHtmlWithBaseHref, getWorkspaceBillingEmails } from './proposal.controller';

function isDeliverableEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (!clean.includes('@') || !clean.includes('.')) return false;
  if (clean.includes('example.com') || clean.includes('example.org') || clean.includes('test.com')) return false;
  if (clean.startsWith('[') || clean.endsWith(']')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

function injectInvoiceData(templateHtml: string, dataObj: any): string {
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

  const currencySymbol = dataObj.metadata?.currency || '₹';
  const subtotalStr = currencySymbol + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const gstStr = currencySymbol + gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` (GST ${gstRate}%)`;
  const totalStr = currencySymbol + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let rendered = templateHtml;

  const loopRegex = /\{\{#invoice\.items\}\}([\s\S]*?)\{\{\/invoice\.items\}\}/g;
  const match = loopRegex.exec(rendered);
  if (match) {
    const rowTemplate = match[1];
    let rowsHtml = '';
    items.forEach((item: any, idx: number) => {
      const qty = parseFloat(item.qty || item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      const rateFormatted = currencySymbol + rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const amtFormatted = currencySymbol + amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let row = rowTemplate;
      row = row.replace(/01/g, String(idx + 1).padStart(2, '0'));
      row = row.replace(/\{\{title\}\}/g, item.name || item.title || '[Item Name]');
      row = row.replace(/\{\{description\}\}/g, item.desc || item.description || '');
      row = row.replace(/\{\{quantity\}\}/g, String(qty));
      row = row.replace(/\{\{rate\}\}/g, rateFormatted);
      row = row.replace(/\{\{amount\}\}/g, amtFormatted);
      rowsHtml += row;
    });
    rendered = rendered.replace(loopRegex, rowsHtml);
  }

  const placeholdersMap: Record<string, string> = {
    '{{invoice.number}}': dataObj.metadata?.invoice_id || '[Invoice ID]',
    '{{invoice.date}}': dataObj.metadata?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{invoice.due_date}}': dataObj.metadata?.due_date || 'Due upon receipt',
    '{{invoice.status}}': 'OVERDUE',
    '{{invoice.status_class}}': 'unpaid',
    '{{client.company_name}}': dataObj.cover?.prepared_for?.company_name || dataObj.client?.company || '[Client Company Name]',
    '{{client.contact_name}}': dataObj.cover?.prepared_for?.lead || dataObj.client?.name || '[Client Contact Name]',
    '{{client.address}}': dataObj.cover?.prepared_for?.address || dataObj.client?.address || '[Client Address]',
    '{{client.email}}': dataObj.cover?.prepared_for?.email || dataObj.client?.email || '[Client Email]',
    '{{client.phone}}': dataObj.cover?.prepared_for?.phone || dataObj.client?.phone || '[Client Phone]',
    '{{client.gst}}': dataObj.cover?.prepared_for?.gst || 'NA',
    '{{proposal.reference}}': dataObj.metadata?.proposal_id || 'None',
    '{{quote.reference}}': dataObj.metadata?.quote_id || 'None',
    '{{project.name}}': dataObj.metadata?.short_title || '[Project Name]',
    '{{project.id}}': dataObj.metadata?.project_id || 'PROJ-INTOAI',
    '{{invoice.subtotal}}': subtotalStr,
    '{{invoice.tax}}': gstStr,
    '{{invoice.total}}': totalStr,
    '{{invoice.amount_paid}}': `${currencySymbol}0.00`,
    '{{invoice.amount_due}}': totalStr,
    '{{invoice.final_label}}': 'Amount Due',
  };

  Object.entries(placeholdersMap).forEach(([k, v]) => {
    rendered = rendered.split(k).join(v);
  });

  return rendered;
}

@Injectable()
export class OverdueInvoiceJob {
  private readonly logger = new Logger(OverdueInvoiceJob.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly mailSender: MailSender,
    @Optional() private readonly serverService?: ServerService
  ) {}

  // Run daily at 09:00 AM server time
  @Cron('0 9 * * *')
  async handleOverdueInvoices() {
    this.logger.log('Starting daily overdue invoice check...');
    try {
      const unpaidInvoices = await this.prisma.workspaceInvoice.findMany({
        where: {
          status: { in: ['Unpaid', 'unpaid', 'Overdue', 'overdue'] },
          isRecurringParent: false,
        },
      });

      if (unpaidInvoices.length === 0) {
        this.logger.log('No unpaid invoices found.');
        return;
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      for (const inv of unpaidInvoices) {
        await this.processSingleInvoice(inv, templateHtml, today, todayStr);
      }
    } catch (e: any) {
      this.logger.error(`Error during overdue invoice job: ${e.message}`, e.stack);
    }
  }

  private async processSingleInvoice(inv: any, templateHtml: string, today: Date, todayStr: string) {
    try {
      const doc = YAML.parseDocument(inv.content);
      const rawDueDate = doc.getIn(['metadata', 'due_date']);
      if (!rawDueDate) return;

      const parsedDueDate = new Date(String(rawDueDate));
      if (isNaN(parsedDueDate.getTime())) return;
      parsedDueDate.setHours(0, 0, 0, 0);

      // Check if due date has passed
      if (parsedDueDate.getTime() >= today.getTime()) {
        if (inv.status === 'Overdue' || inv.status === 'overdue') {
          doc.setIn(['metadata', 'status'], 'Unpaid');
          await this.prisma.workspaceInvoice.update({
            where: {
              workspaceId_invoiceId_version: {
                workspaceId: inv.workspaceId,
                invoiceId: inv.invoiceId,
                version: inv.version,
              },
            },
            data: {
              status: 'Unpaid',
              content: doc.toString(),
            },
          });
          this.logger.log(`Reset extended invoice ${inv.invoiceId} back to Unpaid.`);
        }
        return; // Not overdue yet
      }

      // Update status to Overdue in DB and content
      if (inv.status !== 'Overdue') {
        doc.setIn(['metadata', 'status'], 'Overdue');
        await this.prisma.workspaceInvoice.update({
          where: {
            workspaceId_invoiceId_version: {
              workspaceId: inv.workspaceId,
              invoiceId: inv.invoiceId,
              version: inv.version,
            },
          },
          data: {
            status: 'Overdue',
            content: doc.toString(),
          },
        });
        this.logger.log(`Marked invoice ${inv.invoiceId} as Overdue.`);
      }

      // Prevent sending multiple overdue notice emails on the same calendar day
      const lastSentDate = doc.getIn(['metadata', 'last_overdue_notice_sent']);
      if (lastSentDate === todayStr) {
        return;
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

      const latePaymentPolicyUrl: string =
        serverSettings.company?.latePaymentFeePolicyUrl ||
        serverSettings.latePaymentFeePolicyUrl ||
        'https://www.intoai.ai/terms#late-payment-policy';

      // Resolve workspace profile billing emails
      const wsBilling = await getWorkspaceBillingEmails(this.prisma, inv.workspaceId);

      const toSet = new Set<string>();
      const ccSet = new Set<string>();

      wsBilling.billingMailTo.filter(isDeliverableEmail).forEach(e => toSet.add(e));

      const parsedObj = doc.toJSON();
      const clientEmail = parsedObj.cover?.prepared_for?.email || parsedObj.client?.email || wsBilling.companyMail || '';
      if (toSet.size === 0 && isDeliverableEmail(clientEmail)) {
        toSet.add(clientEmail.trim());
      }

      if (toSet.size === 0) {
        // Find workspace owner / creator
        const member = await (this.prisma as any).workspaceUserPermission?.findFirst({
          where: { workspaceId: inv.workspaceId, type: 0 },
          include: { user: true },
        });
        if (member?.user?.email && isDeliverableEmail(member.user.email)) {
          toSet.add(member.user.email);
        }
      }

      wsBilling.billingMailCc.filter(isDeliverableEmail).forEach(e => {
        if (!toSet.has(e)) ccSet.add(e);
      });

      if (isDeliverableEmail(companyContactEmail) && !toSet.has(companyContactEmail)) {
        ccSet.add(companyContactEmail);
      }

      if (toSet.size === 0) {
        toSet.add(companyContactEmail);
      }

      let pdfBuffer: Buffer | null = null;
      if (templateHtml) {
        try {
          let html = injectInvoiceData(templateHtml, parsedObj);
          const origin = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:3010' : 'http://localhost:8080';
          const htmlWithBase = prepareHtmlWithBaseHref(html, origin);

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
          pdfBuffer = (await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
            displayHeaderFooter: false,
          })) as Buffer;
          await browser.close();
        } catch (pdfErr) {
          this.logger.warn(`Could not generate PDF attachment for overdue invoice ${inv.invoiceId}: ${pdfErr}`);
        }
      }

      const items = parsedObj.items || [];
      let subtotal = 0;
      items.forEach((item: any) => {
        const qty = parseFloat(item.qty || item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        subtotal += qty * rate;
      });
      const gstRate = parseFloat(parsedObj.financials?.gst_rate) || 18;
      const total = subtotal * (1 + gstRate / 100);
      const currencySymbol = parsedObj.metadata?.currency || '₹';
      const totalStr = currencySymbol + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let resolvedWorkspaceName = wsBilling.companyName || '';
      if (!resolvedWorkspaceName) {
        const wsRecord = await this.prisma.workspace.findUnique({
          where: { id: inv.workspaceId },
          select: { name: true },
        });
        if (wsRecord?.name && wsRecord.name.trim()) {
          resolvedWorkspaceName = wsRecord.name.trim();
        }
      }

      const renderedMail = await Renderers.OverduePaymentNotice({
        invoiceId: inv.invoiceId,
        invoiceTitle: inv.title || 'Commercial Invoice',
        workspaceName: resolvedWorkspaceName,
        clientName: inv.preparedFor || parsedObj.cover?.prepared_for?.company_name || 'Valued Client',
        dueDate: String(rawDueDate),
        amountDue: totalStr,
        latePaymentPolicyUrl,
        companyName,
        companyEmail: companyContactEmail,
      });

      const toList = Array.from(toSet);
      const ccList = Array.from(ccSet);

      const mailSent = await this.mailSender.send('OverduePaymentNotice', {
        to: toList.join(', '),
        cc: ccList.length > 0 ? ccList.join(', ') : undefined,
        subject: renderedMail.subject,
        html: renderedMail.html,
        attachments: pdfBuffer
          ? [
              {
                filename: `${inv.invoiceId}.pdf`,
                content: pdfBuffer,
              },
            ]
          : undefined,
      });

      if (mailSent !== false) {
        doc.setIn(['metadata', 'last_overdue_notice_sent'], todayStr);
        await this.prisma.workspaceInvoice.update({
          where: {
            workspaceId_invoiceId_version: {
              workspaceId: inv.workspaceId,
              invoiceId: inv.invoiceId,
              version: inv.version,
            },
          },
          data: {
            content: doc.toString(),
          },
        });
        this.logger.log(`Dispatched Overdue Payment Notice for invoice ${inv.invoiceId} to ${toList.join(', ')}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to process overdue invoice ${inv.invoiceId}: ${err.message}`);
    }
  }
}
