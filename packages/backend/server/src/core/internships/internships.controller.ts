import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth';
import { AccessController } from '../permission';
import { InternshipsService } from './internships.service';
import { ServerService } from '../config';
import { generateQrSvg } from './qr_code';
import { inlineLocalAssets, applyAdminCompanyProfileToHtml } from '../projects/proposal.controller';
import puppeteer from 'puppeteer';

export function prepareHtmlWithBaseHref(html: string, origin: string): string {
  if (!html) return html;
  if (html.includes('<base ') || html.includes('<base>')) {
    return html;
  }
  const cleanOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
  const baseTag = `<base href="${cleanOrigin}/">`;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n  ${baseTag}`);
  }
  return `${baseTag}\n${html}`;
}

@Controller('/api/workspaces/:workspaceId/internships')
export class InternshipsController {
  constructor(
    private readonly internshipsService: InternshipsService,
    private readonly ac: AccessController,
    @Optional() private readonly serverService?: ServerService
  ) {}

  // --- OTP Verification ---
  @Post('/otp')
  async sendOtp(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { purpose?: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const purpose = body.purpose || 'SaveInternshipDocument';
    return this.internshipsService.sendInternshipOtp(user.id, purpose);
  }

  // --- Programs ---
  @Get('/programs')
  async getPrograms(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    return this.internshipsService.getPrograms();
  }

  @Post('/programs')
  async createProgram(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { program: any; otpCode: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!body.otpCode) {
      throw new BadRequestException('Security OTP code is required to create a program.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      body.otpCode,
      'SaveInternshipProgram'
    );
    return this.internshipsService.createProgram(body.program, user.email);
  }

  @Put('/programs/:id')
  async updateProgram(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { program: any; otpCode: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!body.otpCode) {
      throw new BadRequestException('Security OTP code is required to update a program.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      body.otpCode,
      'SaveInternshipProgram'
    );
    return this.internshipsService.updateProgram(parseInt(id, 10), body.program, user.email);
  }

  @Put('/programs/:id/template')
  async updateProgramTemplate(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { templateData: any; otpCode: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!body.otpCode) {
      throw new BadRequestException('Security OTP code is required to save certificate template.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      body.otpCode,
      ['SaveCertificateTemplate', 'SaveInternshipProgram', 'SaveInternshipDocument']
    );
    return this.internshipsService.updateProgramTemplate(parseInt(id, 10), body.templateData, user.email);
  }

  // --- Certificates ---
  @Get('/certificates/generate-id')
  async generateUniqueCertificateId(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Query('year') year?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const certificateNumber = await this.internshipsService.generateUniqueCertificateNumber(y);
    return { certificateNumber };
  }

  @Get('/certificates')
  async getCertificates(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Query('programId') programId?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    const pid = programId ? parseInt(programId, 10) : undefined;
    return this.internshipsService.getCertificates(pid);
  }

  @Post('/certificates')
  async createCertificate(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { certificate: any; otpCode: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!body.otpCode) {
      throw new BadRequestException('Security OTP code is required to add an intern.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      body.otpCode,
      'SaveInternshipCertificate'
    );
    return this.internshipsService.createCertificate(body.certificate, user.email);
  }

  @Post('/certificates/bulk')
  async bulkCreateCertificates(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { programId: number; certificates?: any[]; items?: any[]; otpCode: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!body.otpCode) {
      throw new BadRequestException('Security OTP code is required for bulk enrollment.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      body.otpCode,
      ['BulkAddInterns', 'BulkAddInternshipCertificates']
    );
    const certs = body.certificates || body.items || [];
    return this.internshipsService.bulkCreateCertificates(
      body.programId,
      certs,
      user.email
    );
  }

  @Put('/certificates/:id')
  async updateCertificate(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { certificate: any; otpCode: string }
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    if (!body.otpCode) {
      throw new BadRequestException('Security OTP code is required to update certificate.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      body.otpCode,
      'SaveInternshipCertificate'
    );
    return this.internshipsService.updateCertificate(
      parseInt(id, 10),
      body.certificate,
      user.email
    );
  }

  @Delete('/certificates/:id')
  @Post('/certificates/:id/delete')
  async deleteCertificate(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { otpCode?: string },
    @Query('otpCode') queryOtp?: string
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Write');
    const otpCode = body?.otpCode || queryOtp;
    if (!otpCode) {
      throw new BadRequestException('Security OTP code is required to delete an enrolled intern record.');
    }
    await this.internshipsService.verifyInternshipOtp(
      user.id,
      otpCode,
      ['DeleteInternshipCertificate', 'DeleteIntern']
    );
    return this.internshipsService.deleteCertificate(
      parseInt(id, 10),
      user.email
    );
  }

  // --- PDF Generation ---
  @Post('/pdf')
  async generateCertificatePdf(
    @CurrentUser() user: CurrentUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { html: string; certificateId?: number; certificateNumber?: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
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

    let effectiveOrigin = origin;
    if (effectiveOrigin.includes('one.intoai.ai') || process.env.NODE_ENV === 'production') {
      effectiveOrigin = 'http://127.0.0.1:3010';
    }

    const config = this.serverService?.getConfig() as any;
    const dbOverrides = this.serverService?.getDbOverrides() as any;
    const serverSettings = {
      ...(config?.server || {}),
      ...(dbOverrides?.server || {}),
      ...(config || {}),
      ...(dbOverrides || {}),
    };

    let processedHtml = inlineLocalAssets(body.html, serverSettings);
    processedHtml = applyAdminCompanyProfileToHtml(processedHtml, serverSettings);

    const compName =
      serverSettings?.companyName ||
      serverSettings?.company?.name ||
      serverSettings?.name ||
      'Brightloop Software Solutions';
    const compTagline =
      serverSettings?.companyTagline ||
      serverSettings?.company?.tagline ||
      'Subscription Management & Recurring Billing ERP';

    let resolvedLogoSrc = '';
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

    if (resolvedLogoSrc) {
      processedHtml = processedHtml.replace(/\{\{company\.logo\}\}/g, resolvedLogoSrc);
      processedHtml = processedHtml.replace(/src=["'][^"']*CompanyLogo[^"']*["']/gi, `src="${resolvedLogoSrc}"`);
    } else {
      processedHtml = processedHtml.replace(/\{\{company\.logo\}\}/g, '/CompanyLogo.png');
    }

    processedHtml = processedHtml.replace(/\{\{company\.name\}\}/g, compName);
    processedHtml = processedHtml.replace(/\{\{company\.tagline\}\}/g, compTagline);
    processedHtml = processedHtml.replace(/\{\{signatory\.organization\}\}/g, compName);

    // Dynamic QR Code generation for the specific certificate number
    const certNum = body.certificateNumber || (body.html.match(/INT-\d{4}-\d{6}/)?.[0]) || (body.html.match(/INTOAI\/INT\/[^\s<"']+/)?.[0]) || '';
    if (certNum) {
      const verifyUrl = `https://verify.brightloop.local/certificate/${certNum}`;
      const qrSvg = generateQrSvg(verifyUrl, 68);
      if (qrSvg) {
        processedHtml = processedHtml.replace(/<div class="header-qr-code" id="headerQrCode">[\s\S]*?<\/div>/, `<div class="header-qr-code" id="headerQrCode">${qrSvg}<\/div>`);
      }
    }

    const cleanOrigin = effectiveOrigin.endsWith('/') ? effectiveOrigin.slice(0, -1) : effectiveOrigin;
    const baseTag = `<base href="${cleanOrigin}/">`;
    if (processedHtml.includes('<head>')) {
      processedHtml = processedHtml.replace('<head>', `<head>\n  ${baseTag}`);
    } else {
      processedHtml = `${baseTag}\n${processedHtml}`;
    }

    const certPdfStyle = `
      <style id="pdf-enforce-certificate-style">
        @page {
          size: A4 landscape;
          margin: 0 !important;
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          width: 297mm !important;
          height: 210mm !important;
          min-width: 297mm !important;
          min-height: 210mm !important;
          max-width: 297mm !important;
          max-height: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #FFFFFF !important;
          overflow: hidden !important;
        }
        .certificate-container {
          width: 297mm !important;
          height: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          overflow: hidden !important;
        }
        .certificate-page {
          width: 297mm !important;
          height: 210mm !important;
          min-width: 297mm !important;
          min-height: 210mm !important;
          max-width: 297mm !important;
          max-height: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          transform: none !important;
          overflow: hidden !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .cert-signature-meta-row {
          margin-top: 14px !important;
          margin-bottom: 0px !important;
        }
        .signature-svg-wrap {
          margin-bottom: -4px !important;
        }
        .editable-cert-field {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .hide-on-pdf {
          display: none !important;
        }
      </style>
    `;

    if (processedHtml.includes('</head>')) {
      processedHtml = processedHtml.replace('</head>', `${certPdfStyle}\n</head>`);
    } else {
      processedHtml = certPdfStyle + processedHtml;
    }

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
      await page.setViewport({ width: 1600, height: 1131, deviceScaleFactor: 2 });
      await page.setContent(processedHtml, { waitUntil: ['domcontentloaded', 'networkidle0'] });
      await page.emulateMediaType('screen');
      await page.evaluateHandle('document.fonts.ready').catch(() => {});

      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        displayHeaderFooter: false,
        pageRanges: '1',
      });
      await browser.close();

      // Log download audit
      if (body.certificateId && body.certificateNumber) {
        await this.internshipsService.logDownloadAudit(
          body.certificateId,
          body.certificateNumber,
          user.email
        );
      }

      const filename = body.certificateNumber
        ? `certificate_${body.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        : 'internship_certificate.pdf';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (e: any) {
      throw new BadRequestException(`Failed to generate Certificate PDF: ${e.message}`);
    }
  }
}
