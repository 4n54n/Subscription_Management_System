import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Config } from '../../base';
import { MailSender } from '../mail';
import { Renderers } from '../../mails';

export interface InternshipProgramInput {
  program_code: string;
  program_name: string;
  category?: string;
  description?: string;
  skills?: string;
  learning_outcomes?: string;
  duration?: string;
  mode?: string;
  mentor_name?: string;
  mentor_role?: string;
  program_fee?: number;
  currency?: string;
  status?: string;
}

export interface InternshipCertificateInput {
  certificate_number: string;
  program_id?: number;
  recipient_name: string;
  role?: string;
  holder_email?: string;
  holder_phone?: string;
  start_date?: string;
  end_date?: string;
  issue_date: string;
  issued_by: string;
  issuer_role: string;
  status?: string;
  internship_type?: string;
  scholarship?: number;
  scholarship_currency?: string;
  participant_fee?: number;
  participant_fee_currency?: string;
  stipend?: number;
  stipend_currency?: string;
  payment_status?: string;
  completion_status?: string;
}

@Injectable()
export class InternshipsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: Config,
    private readonly mailSender: MailSender
  ) {}

  // Resolve D1 connection parameters with priority (Admin config > .env)
  private getD1Config() {
    const storagesConfig = (this.config as any).storages;
    const accountId = (
      storagesConfig?.d1?.accountId ||
      process.env.CLOUDFLARE_D1_ACCOUNT_ID ||
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      ''
    ).trim();

    const databaseId = (
      storagesConfig?.d1?.databaseId ||
      process.env.CLOUDFLARE_D1_DATABASE_ID ||
      ''
    ).trim();

    const apiToken = (
      storagesConfig?.d1?.apiToken ||
      process.env.CLOUDFLARE_D1_API_TOKEN ||
      ''
    ).trim();

    return { accountId, databaseId, apiToken };
  }

  // Format SQL string by safely binding parameters into valid SQL to avoid Cloudflare D1 JSON array schema rejections
  private formatSqlWithParams(sql: string, params: any[] = []): string {
    if (!params || !params.length) return sql;
    let paramIndex = 0;
    return sql.replace(/\?/g, () => {
      if (paramIndex >= params.length) return '?';
      const val = params[paramIndex++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
      if (typeof val === 'boolean') return val ? '1' : '0';
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `'${strVal.replace(/'/g, "''")}'`;
    });
  }

  // Execute a single SQL query on Cloudflare D1
  public async executeD1Query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { accountId, databaseId, apiToken } = this.getD1Config();

    if (!accountId || !databaseId || !apiToken) {
      throw new BadRequestException(
        'Cloudflare D1 is not configured. Please configure Account ID, Database UUID, and API Token in Admin Settings > Storage or root .env.'
      );
    }

    const formattedSql = this.formatSqlWithParams(sql, params);
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: formattedSql }),
    });

    const data: any = await response.json().catch(() => null);
    if (!response.ok || !data || !data.success) {
      let errorMsg =
        data?.errors?.map((e: any) => e.message).join(', ') ||
        response.statusText ||
        'Query failed';
      if (errorMsg.includes('UNIQUE constraint failed: internship_programs.program_code')) {
        throw new BadRequestException('This Program Code is already registered in the system. Please specify a unique Program Code.');
      }
      if (errorMsg.includes('UNIQUE constraint failed: internship_certificates.certificate_number')) {
        throw new BadRequestException('This Certificate Number is already in use. Please specify or generate a unique Certificate Number.');
      }
      throw new BadRequestException(`Cloudflare D1 error: ${errorMsg}`);
    }

    const queryResult = data.result?.[0];
    return (queryResult?.results || []) as T[];
  }

  // Execute batch SQL queries on Cloudflare D1
  public async executeD1Batch(statements: { sql: string; params: any[] }[]): Promise<any> {
    const results = [];
    for (const stmt of statements) {
      const res = await this.executeD1Query(stmt.sql, stmt.params);
      results.push(res);
    }
    return results;
  }

  // --- OTP Verification ---
  async sendInternshipOtp(userId: string, purpose: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User profile not found.');

    const targetEmail = user.companyMail || user.email;
    if (!targetEmail) throw new BadRequestException('User email not configured.');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.projectDocOtp.deleteMany({
      where: { email: user.email, purpose },
    });

    await this.prisma.projectDocOtp.create({
      data: {
        email: user.email,
        code,
        expiresAt,
        purpose,
      },
    });

    const emailData = await Renderers.DocumentActionOtp({
      title: 'Internship Security Authorization',
      actionDescription: `Please enter the following one-time verification code to authorize this action (${purpose}):`,
      otp: code,
      userName: user.name || undefined,
      expiresInMinutes: 10,
    });

    await this.mailSender.send('InternshipActionOtp', {
      to: targetEmail,
      subject: '[Brightloop Workspace] Security Verification Code',
      html: emailData.html,
    });

    return { success: true };
  }

  async verifyInternshipOtp(userId: string, code: string, purpose: string | string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User profile not found.');

    const purposeFilter = Array.isArray(purpose) ? { in: purpose } : purpose;

    const record = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: user.email,
        code: code.trim(),
        purpose: purposeFilter,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired OTP verification code.');
    }

    await this.prisma.projectDocOtp.delete({ where: { id: record.id } }).catch(() => {});
    return true;
  }

  // --- Program Operations ---
  async getPrograms() {
    return this.executeD1Query(
      `SELECT * FROM internship_programs ORDER BY created_at DESC;`
    );
  }

  async getProgramById(id: number) {
    const rows = await this.executeD1Query(
      `SELECT * FROM internship_programs WHERE id = ?;`,
      [id]
    );
    if (!rows.length) throw new NotFoundException(`Program with ID ${id} not found.`);
    return rows[0];
  }

    async createProgram(data: InternshipProgramInput, userEmail: string) {
    let cleanCode = (data.program_code || '').trim();
    if (!cleanCode) {
      const year = new Date().getFullYear();
      cleanCode = `INT-AI-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check for collision and auto-resolve to avoid unique constraint crashes
    const existing = await this.executeD1Query(
      `SELECT id, program_name FROM internship_programs WHERE LOWER(program_code) = LOWER(?);`,
      [cleanCode]
    ).catch(() => []);

    if (existing && existing.length > 0) {
      const year = new Date().getFullYear();
      let uniqueFound = false;
      for (let i = 0; i < 20; i++) {
        const candidate = `INT-AI-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
        const check = await this.executeD1Query(
          `SELECT id FROM internship_programs WHERE LOWER(program_code) = LOWER(?);`,
          [candidate]
        ).catch(() => []);
        if (!check || check.length === 0) {
          cleanCode = candidate;
          uniqueFound = true;
          break;
        }
      }
      if (!uniqueFound) {
        cleanCode = `INT-AI-${year}-${Date.now().toString().slice(-4)}`;
      }
    }
    data.program_code = cleanCode;

    const sql = `
      INSERT INTO internship_programs (
        program_code, program_name, category, description,
        skills, learning_outcomes, duration, mode,
        mentor_name, mentor_role, program_fee, currency, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.program_code,
      data.program_name,
      data.category || 'AI Research',
      data.description || '',
      data.skills || '',
      data.learning_outcomes || '',
      data.duration || '3 Months',
      data.mode || 'Remote',
      data.mentor_name || '',
      data.mentor_role || '',
      data.program_fee ?? 0,
      data.currency || 'INR',
      data.status || 'active',
    ];

    await this.executeD1Query(sql, params);
    const created = await this.executeD1Query(
      `SELECT * FROM internship_programs WHERE program_code = ?;`,
      [data.program_code]
    );

    // Audit log
    await this.executeD1Query(
      `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
       VALUES (0, ?, 'PROGRAM_CREATED', ?, ?);`,
      [data.program_code, userEmail, JSON.stringify({ program_name: data.program_name })]
    ).catch(() => {});

    return created[0] || null;
  }

  async updateProgram(id: number, data: Partial<InternshipProgramInput>, userEmail: string) {
    const current = await this.getProgramById(id);
    const sql = `
      UPDATE internship_programs SET
        program_code = ?,
        program_name = ?,
        category = ?,
        description = ?,
        skills = ?,
        learning_outcomes = ?,
        duration = ?,
        mode = ?,
        mentor_name = ?,
        mentor_role = ?,
        program_fee = ?,
        currency = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `;
    const params = [
      data.program_code ?? current.program_code,
      data.program_name ?? current.program_name,
      data.category ?? current.category,
      data.description ?? current.description,
      data.skills ?? current.skills,
      data.learning_outcomes ?? current.learning_outcomes,
      data.duration ?? current.duration,
      data.mode ?? current.mode,
      data.mentor_name ?? current.mentor_name,
      data.mentor_role ?? current.mentor_role,
      data.program_fee ?? current.program_fee,
      data.currency ?? current.currency,
      data.status ?? current.status,
      id,
    ];

    await this.executeD1Query(sql, params);

    // Audit log
    await this.executeD1Query(
      `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
       VALUES (0, ?, 'PROGRAM_UPDATED', ?, ?);`,
      [current.program_code, userEmail, JSON.stringify(data)]
    ).catch(() => {});

    return this.getProgramById(id);
  }

  async updateProgramTemplate(id: number, templateData: any, userEmail: string) {
    const current = await this.getProgramById(id);
    const sql = `
      UPDATE internship_programs SET
        skills = ?,
        learning_outcomes = ?,
        mentor_name = ?,
        mentor_role = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `;
    const params = [
      templateData.researchArea ?? current.skills,
      templateData.projectDescription ?? current.learning_outcomes,
      templateData.issued_by ?? current.mentor_name,
      templateData.issuer_role ?? current.mentor_role,
      id,
    ];
    await this.executeD1Query(sql, params);

    await this.executeD1Query(
      `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
       VALUES (0, ?, 'TEMPLATE_UPDATED', ?, ?);`,
      [current.program_code, userEmail, JSON.stringify(templateData)]
    ).catch(() => {});

    return this.getProgramById(id);
  }

  // --- Certificate Operations ---
  async getCertificates(programId?: number) {
    if (programId) {
      return this.executeD1Query(
        `SELECT c.*, p.program_name, p.program_code 
         FROM internship_certificates c
         LEFT JOIN internship_programs p ON c.program_id = p.id
         WHERE c.deleted_at IS NULL AND c.program_id = ?
         ORDER BY c.created_at DESC;`,
        [programId]
      );
    }
    return this.executeD1Query(
      `SELECT c.*, p.program_name, p.program_code 
       FROM internship_certificates c
       LEFT JOIN internship_programs p ON c.program_id = p.id
       WHERE c.deleted_at IS NULL
       ORDER BY c.created_at DESC;`
    );
  }

  async getCertificateById(id: number) {
    const rows = await this.executeD1Query(
      `SELECT c.*, p.program_name, p.program_code, p.description as program_description, p.skills as program_skills
       FROM internship_certificates c
       LEFT JOIN internship_programs p ON c.program_id = p.id
       WHERE c.id = ? AND c.deleted_at IS NULL;`,
      [id]
    );
    if (!rows.length) throw new NotFoundException(`Certificate with ID ${id} not found.`);
    return rows[0];
  }

  /**
   * Helper to extract 4-digit year from date string or return current year
   */
  public extractYear(dateStr?: string): number {
    if (dateStr) {
      const match = dateStr.match(/\b(20\d\d)\b/);
      if (match) return parseInt(match[1], 10);
      const d = new Date(dateStr);
      if (!isNaN(d.getFullYear()) && d.getFullYear() > 2000) {
        return d.getFullYear();
      }
    }
    return new Date().getFullYear();
  }

  /**
   * Generate a random 6-digit string between 100000 and 999999
   */
  public generateRandom6Digit(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check if a certificate number already exists in Cloudflare D1
   */
  public async checkCertificateNumberExists(certificateNumber: string): Promise<boolean> {
    if (!certificateNumber) return false;
    try {
      const rows = await this.executeD1Query(
        `SELECT id FROM internship_certificates WHERE certificate_number = ? AND deleted_at IS NULL LIMIT 1;`,
        [certificateNumber.trim()]
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique certificate number in the format: INT-<YEAR>-<6_DIGIT_RANDOM>
   * E.g. INT-2026-370888
   * Checks Cloudflare D1 to ensure zero collision with existing records,
   * and checks an optional in-memory Set (used during batch/bulk operations).
   */
  public async generateUniqueCertificateNumber(
    year?: number,
    inMemoryExclusions?: Set<string>,
    maxRetries = 30
  ): Promise<string> {
    const y = year || new Date().getFullYear();
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const candidate = `INT-${y}-${this.generateRandom6Digit()}`;
      if (inMemoryExclusions && inMemoryExclusions.has(candidate)) {
        continue;
      }
      const exists = await this.checkCertificateNumberExists(candidate);
      if (!exists) {
        if (inMemoryExclusions) {
          inMemoryExclusions.add(candidate);
        }
        return candidate;
      }
    }
    // High-entropy fallback if 30 random picks collide (extremely rare)
    const fallback = `INT-${y}-${Date.now().toString().slice(-6)}`;
    if (inMemoryExclusions) inMemoryExclusions.add(fallback);
    return fallback;
  }

  async createCertificate(data: InternshipCertificateInput, userEmail: string) {
    const year = this.extractYear(data.issue_date || data.end_date || data.start_date);
    let certNum = (data.certificate_number || '').trim();

    // Check if certificate_number is missing, not in INT-YYYY-XXXXXX format, or already exists in D1
    const isStandardFormat = /^INT-\d{4}-\d{6}$/.test(certNum);
    const isTaken = certNum ? await this.checkCertificateNumberExists(certNum) : false;

    if (!certNum || !isStandardFormat || isTaken) {
      // Gracefully handle collision by auto-generating a unique 6-digit random ID
      certNum = await this.generateUniqueCertificateNumber(year);
    }
    data.certificate_number = certNum;

    const sql = `
      INSERT INTO internship_certificates (
        certificate_number, recipient_name, role, holder_email, holder_phone,
        start_date, end_date, issue_date, issued_by, issuer_role,
        status, program_id, internship_type, scholarship, scholarship_currency,
        participant_fee, participant_fee_currency, stipend, stipend_currency,
        payment_status, completion_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      data.certificate_number,
      data.recipient_name,
      data.role || 'AI Research Intern',
      data.holder_email || null,
      data.holder_phone || null,
      data.start_date || null,
      data.end_date || null,
      data.issue_date,
      data.issued_by,
      data.issuer_role,
      data.status || 'valid',
      data.program_id || null,
      data.internship_type || 'Research',
      data.scholarship ?? null,
      data.scholarship_currency || 'INR',
      data.participant_fee ?? null,
      data.participant_fee_currency || 'INR',
      data.stipend ?? null,
      data.stipend_currency || 'INR',
      data.payment_status || 'Paid',
      data.completion_status || 'Completed',
    ];

    await this.executeD1Query(sql, params);
    const created = await this.executeD1Query(
      `SELECT * FROM internship_certificates WHERE certificate_number = ?;`,
      [data.certificate_number]
    );
    const cert = created[0];

    // Audit Log
    if (cert) {
      await this.executeD1Query(
        `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
         VALUES (?, ?, 'CREATED', ?, ?);`,
        [cert.id, cert.certificate_number, userEmail, JSON.stringify({ recipient: cert.recipient_name })]
      ).catch(() => {});
    }

    return cert;
  }

  async bulkCreateCertificates(
    programId: number,
    items: InternshipCertificateInput[],
    userEmail: string
  ) {
    if (!items.length) return [];

    const validProgramId = typeof programId === 'string' ? parseInt(programId, 10) : programId;
    const batchUsedNumbers = new Set<string>();

    // Validate, format, and de-duplicate certificate numbers before executing
    for (const data of items) {
      const year = this.extractYear(data.issue_date || data.end_date || data.start_date);
      let certNum = (data.certificate_number || '').trim();

      const isStandardFormat = /^INT-\d{4}-\d{6}$/.test(certNum);
      const isBatchDuplicate = certNum ? batchUsedNumbers.has(certNum) : false;
      const isDbDuplicate = certNum && !isBatchDuplicate ? await this.checkCertificateNumberExists(certNum) : false;

      if (!certNum || !isStandardFormat || isBatchDuplicate || isDbDuplicate) {
        // Resolve collision by generating a guaranteed-unique 6-digit random ID
        certNum = await this.generateUniqueCertificateNumber(year, batchUsedNumbers);
      } else {
        batchUsedNumbers.add(certNum);
      }
      data.certificate_number = certNum;
    }

    // Insert certificates sequentially with sanitized scalar parameters
    for (const data of items) {
      const sql = `
        INSERT INTO internship_certificates (
          certificate_number, recipient_name, role, holder_email, holder_phone,
          start_date, end_date, issue_date, issued_by, issuer_role,
          status, program_id, internship_type, scholarship, scholarship_currency,
          participant_fee, participant_fee_currency, stipend, stipend_currency,
          payment_status, completion_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const params = [
        data.certificate_number,
        (data.recipient_name || '').trim(),
        (data.role || 'AI Research Intern').trim(),
        data.holder_email ? data.holder_email.trim() : null,
        data.holder_phone ? data.holder_phone.trim() : null,
        data.start_date || null,
        data.end_date || null,
        data.issue_date || data.end_date || data.start_date || null,
        data.issued_by || 'Director',
        data.issuer_role || 'Director',
        data.status || 'valid',
        validProgramId,
        data.internship_type || 'Research',
        data.scholarship != null ? Number(data.scholarship) : null,
        data.scholarship_currency || 'INR',
        data.participant_fee != null ? Number(data.participant_fee) : null,
        data.participant_fee_currency || 'INR',
        data.stipend != null ? Number(data.stipend) : null,
        data.stipend_currency || 'INR',
        data.payment_status || 'Paid',
        data.completion_status || 'Completed',
      ];

      await this.executeD1Query(sql, params);

      // Non-blocking audit log
      this.executeD1Query(
        `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
         VALUES (0, ?, 'BULK_CREATED', ?, ?);`,
        [
          data.certificate_number,
          userEmail,
          JSON.stringify({ recipient: data.recipient_name, programId: validProgramId }),
        ]
      ).catch(() => {});
    }

    return this.getCertificates(validProgramId);
  }

  async updateCertificate(id: number, data: Partial<InternshipCertificateInput>, userEmail: string) {
    const current = await this.getCertificateById(id);
    const sql = `
      UPDATE internship_certificates SET
        recipient_name = ?,
        role = ?,
        holder_email = ?,
        holder_phone = ?,
        start_date = ?,
        end_date = ?,
        issue_date = ?,
        issued_by = ?,
        issuer_role = ?,
        status = ?,
        internship_type = ?,
        scholarship = ?,
        participant_fee = ?,
        stipend = ?,
        payment_status = ?,
        completion_status = ?
      WHERE id = ?;
    `;
    const params = [
      data.recipient_name ?? current.recipient_name,
      data.role ?? current.role,
      data.holder_email ?? current.holder_email,
      data.holder_phone ?? current.holder_phone,
      data.start_date ?? current.start_date,
      data.end_date ?? current.end_date,
      data.issue_date ?? current.issue_date,
      data.issued_by ?? current.issued_by,
      data.issuer_role ?? current.issuer_role,
      data.status ?? current.status,
      data.internship_type ?? current.internship_type,
      data.scholarship ?? current.scholarship,
      data.participant_fee ?? current.participant_fee,
      data.stipend ?? current.stipend,
      data.payment_status ?? current.payment_status,
      data.completion_status ?? current.completion_status,
      id,
    ];

    await this.executeD1Query(sql, params);

    await this.executeD1Query(
      `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
       VALUES (?, ?, 'UPDATED', ?, ?);`,
      [id, current.certificate_number, userEmail, JSON.stringify(data)]
    ).catch(() => {});

    return this.getCertificateById(id);
  }

  async deleteCertificate(id: number, userEmail: string) {
    const cert = await this.getCertificateById(id);
    await this.executeD1Query(
      `UPDATE internship_certificates SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      [id]
    );
    await this.executeD1Query(
      `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
       VALUES (?, ?, 'DELETED', ?, ?);`,
      [id, cert.certificate_number, userEmail, JSON.stringify({ recipient: cert.recipient_name })]
    ).catch(() => {});
    return { success: true, id };
  }

  // --- PDF Generation / Helpers ---

  async logDownloadAudit(id: number, certNumber: string, userEmail: string) {
    return this.executeD1Query(
      `INSERT INTO certificate_audit (certificate_id, certificate_number, action, performed_by, details)
       VALUES (?, ?, 'DOWNLOADED', ?, ?);`,
      [id, certNumber, userEmail, JSON.stringify({ timestamp: new Date().toISOString() })]
    ).catch(() => {});
  }
}
