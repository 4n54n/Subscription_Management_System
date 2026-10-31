import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { MailSender } from '../mail';
import { Renderers } from '../../mails';
import { ServerService } from '../config';
import { prepareHtmlWithBaseHref, injectInvoiceData } from './proposal.controller';

@Injectable()
export class RecurringInvoiceCronJob {
  private readonly logger = new Logger(RecurringInvoiceCronJob.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly mailSender: MailSender,
    @Optional() private readonly serverService?: ServerService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Scanning for pending recurring invoices...');
    const now = new Date();
    let pendingInvoices: any[] = [];
    try {
      pendingInvoices = await this.prisma.workspaceInvoice.findMany({
        where: {
          isRecurring: true,
          isRecurringParent: true,
          recurringNextDate: {
            lte: now,
          },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
        this.logger.debug('workspace_invoices table does not exist in database yet.');
        return;
      }
      this.logger.error(`Error checking recurring invoices: ${err.message}`, err.stack);
      return;
    }

    if (pendingInvoices.length === 0) {
      return;
    }

    this.logger.log(`Found ${pendingInvoices.length} pending recurring invoices to process.`);

    let templateHtml = '';
    const pathsToTry = [
      path.join(process.cwd(), '../../frontend/core/public/invoice_template.html'),
      path.join(process.cwd(), '../frontend/core/public/invoice_template.html'),
      path.join(process.cwd(), 'packages/frontend/core/public/invoice_template.html'),
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
      this.logger.error('Failed to locate invoice_template.html. Aborting recurring process.');
      return;
    }

    for (const inv of pendingInvoices) {
      await this.processRecurringInvoice(inv, templateHtml);
    }
  }

  private async processRecurringInvoice(inv: any, templateHtml: string) {
    this.logger.log(`Processing recurring invoice ${inv.invoiceId} for workspace ${inv.workspaceId}`);
    try {
      const doc = YAML.parseDocument(inv.content);
      const rand3 = Math.floor(100 + Math.random() * 900);
      const dateObj = new Date();
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const newInvoiceId = `${inv.invoiceId}-${yyyy}${mm}${dd}-${rand3}`;

      doc.setIn(['metadata', 'invoice_id'], newInvoiceId);
      const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      // Calculate due date dynamically based on master template due_days (defaults to 20 days)
      const rawDueDays = doc.getIn(['metadata', 'due_days']) ?? doc.getIn(['financials', 'due_days']) ?? 20;
      const dueDays = parseInt(String(rawDueDays), 10) || 20;
      const dueDateObj = new Date(dateObj.getTime() + dueDays * 24 * 60 * 60 * 1000);
      const formattedDueDate = dueDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      doc.setIn(['metadata', 'due_date'], formattedDueDate);
      doc.setIn(['metadata', 'version'], '1.0');
      doc.setIn(['metadata', 'status'], 'Unpaid');

      const newYaml = doc.toString();
      const parsedObj = doc.toJSON();

      await this.prisma.workspaceInvoice.create({
        data: {
          workspaceId: inv.workspaceId,
          invoiceId: newInvoiceId,
          version: '1.0',
          title: inv.title,
          preparedFor: inv.preparedFor,
          preparedDate: new Date(),
          content: newYaml,
          status: 'Unpaid',
          quoteIdConnect: inv.quoteIdConnect,
          proposalIdConnect: inv.proposalIdConnect,
          isRecurring: false,
          isRecurringParent: false,
          parentInvoiceId: inv.invoiceId,
        },
      });

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

      let html = injectInvoiceData(templateHtml, parsedObj, serverSettings);
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

      this.logger.log(`Compiled A4 PDF for invoice ${newInvoiceId}`);

      const items = parsedObj.items || [];
      let subtotal = 0;
      items.forEach((item: any) => {
        const qty = parseFloat(item.qty || item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        subtotal += qty * rate;
      });
      const gstRate = parseFloat(parsedObj.financials?.gst_rate) || 18;
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

      let creatorEmail = '';
      if (inv.recurringCreatorId) {
        try {
          const u = await this.prisma.user.findUnique({ where: { id: inv.recurringCreatorId }, select: { email: true } });
          if (u?.email) creatorEmail = u.email;
        } catch (e) {}
      }
      if (!creatorEmail) {
        try {
          const wsUser = await this.prisma.workspaceUserRole.findFirst({
            where: { workspaceId: inv.workspaceId },
            include: { user: { select: { email: true } } },
          });
          if (wsUser?.user?.email) creatorEmail = wsUser.user.email;
        } catch (e) {}
      }

      const clientEmail = parsedObj?.cover?.prepared_for?.email || parsedObj?.client?.email || '';
      const configuredTo = inv.recurringRecipient || '';
      const configuredCc = inv.recurringCc || '';

      const toSet = new Set<string>();
      const ccSet = new Set<string>();

      configuredTo.split(/[,;\s]+/).map((e: string) => e.trim()).filter(isDeliverableEmail).forEach((e: string) => toSet.add(e));
      if (isDeliverableEmail(clientEmail)) {
        toSet.add(clientEmail.trim());
      }
      if (toSet.size === 0 && isDeliverableEmail(creatorEmail)) {
        toSet.add(creatorEmail);
      }

      configuredCc.split(/[,;\s]+/).map((e: string) => e.trim()).filter(isDeliverableEmail).forEach((e: string) => {
        if (!toSet.has(e)) ccSet.add(e);
      });
      if (isDeliverableEmail(creatorEmail) && !toSet.has(creatorEmail)) {
        ccSet.add(creatorEmail);
      }

      if (toSet.size === 0) {
        toSet.add(companyEmail);
      }

      const toList = Array.from(toSet);
      const ccList = Array.from(ccSet);

      let resolvedWorkspaceName = '';
      try {
        const wsRecord = await this.prisma.workspace.findUnique({
          where: { id: inv.workspaceId },
          select: { name: true },
        });
        if (wsRecord?.name && wsRecord.name.trim()) {
          resolvedWorkspaceName = wsRecord.name.trim();
        }
      } catch (e) {
        this.logger.warn(`Could not resolve workspace name for ${inv.workspaceId}: ${(e as any)?.message}`);
      }

      const renderedMail = await Renderers.RecurringInvoice({
        invoiceId: newInvoiceId,
        invoiceTitle: inv.title || 'Commercial Invoice',
        workspaceName: resolvedWorkspaceName,
        clientName: inv.preparedFor || parsedObj?.metadata?.prepared_for || 'Valued Client',
        issueDate: formattedDate,
        dueDate: formattedDueDate,
        billingInterval: inv.recurringFrequency || 'monthly',
        totalAmount: totalStr,
        status: 'Unpaid / Pending Payment',
        companyName,
        companyEmail,
      });

      await this.mailSender.send('RecurringInvoice', {
        to: toList.join(', '),
        cc: ccList.length > 0 ? ccList.join(', ') : undefined,
        subject: renderedMail.subject,
        html: renderedMail.html,
        attachments: [
          {
            filename: `${newInvoiceId}.pdf`,
            content: pdfBuffer,
          }
        ]
      });

      this.logger.log(`Dispatched autogenerated invoice email for ${newInvoiceId} to [${toList.join(', ')}] (cc: [${ccList.join(', ')}])`);

      const nextDate = new Date(inv.recurringNextDate);
      if (inv.recurringFrequency === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (inv.recurringFrequency === 'quarterly') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (inv.recurringFrequency === 'half_year') {
        nextDate.setMonth(nextDate.getMonth() + 6);
      } else if (inv.recurringFrequency === 'year') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      await this.prisma.workspaceInvoice.update({
        where: {
          workspaceId_invoiceId_version: {
            workspaceId: inv.workspaceId,
            invoiceId: inv.invoiceId,
            version: inv.version,
          }
        },
        data: {
          recurringNextDate: nextDate,
        }
      });

      this.logger.log(`Updated original invoice recurring schedule nextDate to ${nextDate.toISOString()}`);
    } catch (err: any) {
      this.logger.error(`Failed to process recurring invoice ${inv.invoiceId}: ${err.message}`, err.stack);
    }
  }
}
