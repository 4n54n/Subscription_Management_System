import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Config, OnEvent } from '../../base';
import { MailSender } from '../mail/sender';
import { AiModelFallbackService } from '../config';

export interface PhishCredentials {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface EmailIngestInput {
  userEmail: string;
  messageId?: string;
  sender: string;
  recipient: string;
  subject: string;
  bodySnippet?: string;
  attachmentNames?: string[];
}

@Injectable()
export class PhishService implements OnModuleInit {
  private readonly logger = new Logger(PhishService.name);
  private lastErrorMsg?: string;
  private lastErrorAt?: Date;

  constructor(
    private readonly db: PrismaClient,
    private readonly config: Config,
    private readonly mailSender: MailSender,
    @Optional() private readonly fallbackService?: AiModelFallbackService
  ) {}

  private systemInError = false;
  private errorCooldownUntil = 0;

  onModuleInit() {
    this.logger.log('PhishService initialized');
  }

  recordError(msg: string) {
    this.lastErrorMsg = msg;
    this.lastErrorAt = new Date();
    // Enforce 5-minute cooldown (300,000 ms) before resolution email can be triggered
    this.errorCooldownUntil = Date.now() + 5 * 60 * 1000;
    this.logger.warn(`Phish Error Recorded: ${msg}`);

    // If system was not in error, send Email 1: Error Notification
    if (!this.systemInError) {
      this.systemInError = true;
      this.sendSystemErrorEmail(msg).catch(err => {
        this.logger.error(`Failed to dispatch system error email: ${err.message}`);
      });
    }
  }

  recordSuccess() {
    // Only send Email 2: Resolved Notification after the 5-minute retry cooldown has passed!
    if (this.systemInError && Date.now() >= this.errorCooldownUntil) {
      const prevError = this.lastErrorMsg || 'System API error';
      this.systemInError = false;
      this.lastErrorMsg = undefined;
      this.errorCooldownUntil = 0;
      this.sendSystemResolvedEmail(prevError).catch(err => {
        this.logger.error(`Failed to dispatch system resolved email: ${err.message}`);
      });
    }
  }

  // Get credentials: From Database config
  getCredentials(): PhishCredentials & { lastErrorMsg?: string; lastErrorAt?: Date } {
    const dbConfig = this.config.phish || {};
    const enabled = Boolean(dbConfig.enabled);
    const tenantId = (dbConfig.tenantId || process.env.MICROSOFT_PHISH_TENANT_ID || '').trim();
    const clientId = (dbConfig.clientId || process.env.MICROSOFT_PHISH_CLIENT_ID || '').trim();
    const clientSecret = (dbConfig.clientSecret || process.env.MICROSOFT_PHISH_CLIENT_SECRET || '').trim();

    return {
      enabled,
      tenantId,
      clientId,
      clientSecret,
      lastErrorMsg: this.lastErrorMsg,
      lastErrorAt: this.lastErrorAt,
    };
  }

  // Auto-listener when new account is registered
  @OnEvent('user.created')
  async handleUserCreated(user: { id: string; email: string }) {
    try {
      await this.checkAndAddUserToMonitoring(user.id, user.email);
    } catch (e: any) {
      this.logger.error(`Error handling user registration phish check for ${user.email}: ${e.message}`);
    }
  }

  @OnEvent('user.postCreated')
  async handleUserPostCreated(user: { id: string; email: string }) {
    try {
      await this.checkAndAddUserToMonitoring(user.id, user.email);
    } catch (e: any) {
      this.logger.error(`Error handling user postCreated phish check for ${user.email}: ${e.message}`);
    }
  }

  // Query MS Graph API to verify user mailbox registration
  async checkMicrosoftMailbox(email: string): Promise<{ registered: boolean; msUserId?: string; totalReceivedMails?: number; error?: string }> {
    const creds = this.getCredentials();
    if (!creds.enabled) {
      return { registered: false, error: 'Phish monitoring is currently disabled in settings' };
    }

    if (!creds.tenantId || !creds.clientId || !creds.clientSecret) {
      return { registered: false, error: 'Microsoft Phish OAuth credentials (tenant, client ID, secret) are missing' };
    }

    try {
      // Get App Access Token via Client Credentials Grant
      const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      });

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        this.logger.error(`MS Graph Token acquisition failed: ${errText}`);
        let parsedErr = `Auth failed: ${tokenRes.statusText}`;
        try {
          const jsonErr = JSON.parse(errText);
          parsedErr = jsonErr.error_description || jsonErr.error?.message || parsedErr;
        } catch {}
        return { registered: false, error: parsedErr };
      }

      const tokenData: any = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Query MS Graph directly for user inbox (requires Mail.Read permission only)
      let totalReceivedMails = 0;
      let mailboxErrorMsg: string | undefined;
      let isRegistered = false;

      // Strategy A: Direct inbox folder well-known name
      const inboxRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/mailFolders/inbox`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (inboxRes.ok) {
        const inboxData: any = await inboxRes.json();
        isRegistered = true;
        totalReceivedMails = typeof inboxData.totalItemCount === 'number' ? inboxData.totalItemCount : 0;
      } else if (inboxRes.status === 404) {
        // User mailbox not found on Microsoft 365 Exchange
        return { registered: false };
      } else {
        const errText = await inboxRes.text();
        this.logger.warn(`MS Graph inbox check for ${email} returned ${inboxRes.status}: ${errText}`);
        if (inboxRes.status === 403) {
          mailboxErrorMsg = 'Mail.Read permission missing in Azure AD App Registration';
        }

        // Strategy B: Query all mailFolders and locate inbox
        const foldersRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/mailFolders`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (foldersRes.ok) {
          const foldersData: any = await foldersRes.json();
          isRegistered = true;
          const inbox = (foldersData.value || []).find((f: any) =>
            f.wellKnownName === 'inbox' ||
            f.displayName?.toLowerCase() === 'inbox' ||
            f.displayName?.toLowerCase() === 'inbox/received'
          );
          if (inbox && typeof inbox.totalItemCount === 'number') {
            totalReceivedMails = inbox.totalItemCount;
            mailboxErrorMsg = undefined;
          }
        } else if (foldersRes.status === 404) {
          return { registered: false };
        } else {
          // Strategy C: Query messages count with eventual consistency
          const msgCountRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/messages?$top=1&$count=true`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              ConsistencyLevel: 'eventual',
            },
          });

          if (msgCountRes.ok) {
            const msgData: any = await msgCountRes.json();
            isRegistered = true;
            if (typeof msgData['@odata.count'] === 'number') {
              totalReceivedMails = msgData['@odata.count'];
              mailboxErrorMsg = undefined;
            }
          } else if (msgCountRes.status === 404) {
            return { registered: false };
          }
        }
      }

      return {
        registered: isRegistered,
        totalReceivedMails,
        error: mailboxErrorMsg,
      };
    } catch (e: any) {
      this.logger.error(`Error querying MS Graph for ${email}: ${e.message}`);
      return { registered: false, error: e.message };
    }
  }

  // Remove user from phish monitoring
  async removeUserFromMonitoring(userId: string) {
    await this.db.phishMonitoredUser.deleteMany({
      where: { userId },
    });
    return true;
  }

  // Add or update user phish monitoring record
  async checkAndAddUserToMonitoring(userId: string, email: string) {
    const checkResult = await this.checkMicrosoftMailbox(email);

    let status = 'unchecked';
    if (checkResult.registered) {
      status = 'monitored';
    } else if (checkResult.error) {
      status = 'failed';
    } else {
      status = 'not_registered';
    }

    const msMailboxStatus = checkResult.registered
      ? (checkResult.error ? `active (${checkResult.error})` : 'active')
      : (checkResult.error || 'none');

    const totalMails = checkResult.totalReceivedMails || 0;

    const record = await this.db.phishMonitoredUser.upsert({
      where: { userId },
      create: {
        userId,
        email,
        status,
        msUserId: checkResult.msUserId || null,
        msMailboxStatus,
        totalReceivedMails: totalMails,
        lastCheckedAt: new Date(),
      } as any,
      update: {
        email,
        status,
        msUserId: checkResult.msUserId || null,
        msMailboxStatus,
        ...(checkResult.registered ? { totalReceivedMails: totalMails } : {}),
        lastCheckedAt: new Date(),
      } as any,
    });

    if (checkResult.registered) {
      // Sync messages from MS Graph inbox into Phish Email Queue
      this.syncUserMicrosoftEmails(userId).catch(err => {
        this.logger.error(`Error auto-syncing emails for ${email}: ${err.message}`);
      });
    }

    return record;
  }

  // Get Gemini API Key
  getGeminiApiKey(): string {
    const liveKey = this.fallbackService?.getApiKey();
    if (liveKey) return liveKey;

    const copilotConfig = (this.config as any).copilot || {};
    const aiConfig = (this.config as any).ai || {};
    const phishConfig = (this.config as any).phish || {};

    const apiKey =
      copilotConfig.providers?.gemini?.apiKey ||
      copilotConfig.providers?.google?.apiKey ||
      aiConfig.providers?.gemini?.apiKey ||
      aiConfig.providers?.google?.apiKey ||
      aiConfig.googleApiKey ||
      phishConfig.apiKey ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_GEMINI_API_KEY'] ||
      '';
    return apiKey.trim();
  }

  // AI Phishing Inspection using Gemini API
  async analyzeEmailPhishing(data: {
    sender: string;
    recipient: string;
    subject: string;
    bodySnippet?: string;
    attachmentNames?: string[];
  }): Promise<{ riskLevel: 'clean' | 'suspicious' | 'phishing'; riskScore: number; summary: string; indicators: string[]; workingModel?: string }> {
    const apiKey = this.getGeminiApiKey();

    if (!apiKey) {
      const errorMsg = 'Google Gemini API Key is not configured in Admin AI settings (/admin/ai)';
      this.recordError(errorMsg);
      throw new Error(errorMsg);
    }

    const prompt = `You are an expert AI Email Cybersecurity & Anti-Phishing Analyzer.
Analyze the following email data to determine if it is a phishing attack, credential harvesting attempt, spear-phishing, or malware delivery.

Sender: ${data.sender}
Recipient: ${data.recipient}
Subject: ${data.subject}
Body Snippet: ${data.bodySnippet || '(No body content)'}
Attachments: ${data.attachmentNames && data.attachmentNames.length > 0 ? data.attachmentNames.join(', ') : 'None'}

Return ONLY a JSON object with this exact structure:
{
  "riskLevel": "clean" | "suspicious" | "phishing",
  "riskScore": integer between 0 and 100,
  "summary": "Clear, objective explanation of why this email is safe or why it is suspicious/phishing",
  "indicators": ["Indicator 1", "Indicator 2", "Indicator 3"]
}`;

    const dbOverrides = this.fallbackService?.getDbOverrides?.();
    const configuredModel =
      (dbOverrides as any)?.phish?.model ||
      (this.config.phish as any)?.model ||
      process.env['MICROSOFT_PHISH_MODEL'] ||
      'gemini-2.5-flash-lite';
    const selectedModel = String(configuredModel).replace(/^models\//, '').trim() || 'gemini-2.5-flash-lite';

    const runSingleModelInspection = async (modelToUse: string) => {
      const cleanModelName = String(modelToUse).replace(/^models\//, '').trim();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModelName)}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`Gemini API error for phish: ${res.status} ${errText}`);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const resData: any = await res.json();
      const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(responseText);
    };

    try {
      let parsed: any;
      let workingModelName = selectedModel;

      if (this.fallbackService) {
        const { result, workingModel } = await this.fallbackService.executeWithFallback({
          feature: 'phish',
          primaryModel: selectedModel,
          customApiKey: apiKey,
          runner: (candidateModel) => runSingleModelInspection(candidateModel),
        });
        parsed = result;
        workingModelName = workingModel;
      } else {
        parsed = await runSingleModelInspection(selectedModel);
      }

      this.recordSuccess();
      this.logger.log(`[Phish AI] Working model: ${workingModelName}`);

      return {
        riskLevel: parsed.riskLevel || 'clean',
        riskScore: typeof parsed.riskScore === 'number' ? parsed.riskScore : 0,
        summary: parsed.summary || 'Analyzed for phishing threats',
        indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
        workingModel: workingModelName,
      };
    } catch (e: any) {
      const errorMsg = `Phish AI API error: ${e?.message || 'Execution failed'}`;
      this.recordError(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // Ingest incoming email and run AI check
  async ingestEmail(input: EmailIngestInput) {
    const user = await this.db.user.findUnique({
      where: { email: input.userEmail },
    });

    if (!user) {
      throw new Error(`Monitored user not found with email ${input.userEmail}`);
    }

    let monitoredUser = await this.db.phishMonitoredUser.findUnique({
      where: { userId: user.id },
    });

    if (!monitoredUser) {
      monitoredUser = await this.checkAndAddUserToMonitoring(user.id, user.email);
    }

    // Confirm incoming mail only (ignore outgoing emails sent by the employee)
    const isOutgoing = input.sender.trim().toLowerCase() === input.userEmail.trim().toLowerCase();
    if (isOutgoing) {
      this.logger.log(`Skipping phishing inspection for outgoing mail sent by ${input.userEmail}`);
      const skippedItem = await this.db.phishEmailQueue.create({
        data: {
          monitoredUserId: monitoredUser.id,
          messageId: input.messageId || `MSG-${Date.now()}`,
          sender: input.sender,
          recipient: input.recipient || input.userEmail,
          subject: input.subject,
          bodySnippet: input.bodySnippet || '',
          attachmentNames: input.attachmentNames || [],
          status: 'completed',
        },
      });
      return { queueItem: skippedItem, incident: null, analysis: { riskLevel: 'clean', riskScore: 0, summary: 'Outgoing email - inspection skipped', indicators: [] } };
    }

    // Increment total received mails count for monitored user
    await this.db.phishMonitoredUser.update({
      where: { id: monitoredUser.id },
      data: { totalReceivedMails: { increment: 1 } } as any,
    });

    // Create queue record
    const queueItem = await this.db.phishEmailQueue.create({
      data: {
        monitoredUserId: monitoredUser.id,
        messageId: input.messageId || `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sender: input.sender,
        recipient: input.recipient || input.userEmail,
        subject: input.subject,
        bodySnippet: input.bodySnippet || '',
        attachmentNames: input.attachmentNames || [],
        status: 'analyzing',
      },
    });

    try {
      // Analyze with AI
      const analysis = await this.analyzeEmailPhishing({
        sender: input.sender,
        recipient: input.recipient || input.userEmail,
        subject: input.subject,
        bodySnippet: input.bodySnippet,
        attachmentNames: input.attachmentNames,
      });

      // Save incident if suspicious or phishing
      const isThreat = analysis.riskLevel === 'phishing' || analysis.riskLevel === 'suspicious';

      const incident = await this.db.phishIncident.create({
        data: {
          emailQueueId: queueItem.id,
          monitoredUserId: monitoredUser.id,
          riskLevel: analysis.riskLevel,
          riskScore: analysis.riskScore,
          summary: analysis.summary,
          indicators: analysis.indicators,
          alertSent: isThreat,
        },
      });

      // Update queue item status to completed
      await this.db.phishEmailQueue.update({
        where: { id: queueItem.id },
        data: { status: 'completed' },
      });

      // Send email alert ONLY when AI successfully ran and detected a threat
      if (isThreat) {
        await this.sendPhishingAlert(monitoredUser.email, input, analysis);
      }

      return { queueItem, incident, analysis };
    } catch (e: any) {
      this.logger.warn(`AI inspection pending/failed for queue item ${queueItem.id}: ${e.message}`);
      
      // Keep in queue as pending (Pending AI category), DO NOT SEND ANY EMAIL!
      const updatedQueue = await this.db.phishEmailQueue.update({
        where: { id: queueItem.id },
        data: {
          status: 'pending',
          retryCount: queueItem.retryCount + 1,
          errorMessage: e.message,
        },
      });

      return {
        queueItem: updatedQueue,
        incident: null,
        analysis: {
          riskLevel: 'clean' as const,
          riskScore: 0,
          summary: `Pending AI inspection (${e.message})`,
          indicators: [],
        },
      };
    }
  }

  // Send HTML Alert Email to Employee and CC to Company Support Email
  async sendPhishingAlert(
    employeeEmail: string,
    emailData: EmailIngestInput,
    analysis: { riskLevel: string; riskScore: number; summary: string; indicators: string[] }
  ) {
    const serverConfig = this.config.server || {};
    const companySupportMail = serverConfig.supportEmail || serverConfig.email || 'support@brightloop.local';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .badge-phishing { display: inline-block; background: #ef4444; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
    .badge-suspicious { display: inline-block; background: #f59e0b; color: #ffffff; font-weight: 700; font-size: 12px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 16px 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .meta-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; font-family: 'IBM Plex Mono', monospace; }
    .meta-row { display: flex; margin-bottom: 6px; }
    .meta-label { font-weight: 600; color: #64748b; width: 120px; flex-shrink: 0; }
    .meta-val { color: #0f172a; word-break: break-all; }
    .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px; margin: 20px 0; }
    .reason-title { font-weight: 700; color: #991b1b; font-size: 14px; margin-bottom: 8px; }
    .indicators-list { margin: 8px 0 0 0; padding-left: 20px; color: #7f1d1d; font-size: 13px; }
    .footer { border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div>
      <span class="${analysis.riskLevel === 'phishing' ? 'badge-phishing' : 'badge-suspicious'}">
        ${analysis.riskLevel === 'phishing' ? 'Phishing Threat Alert' : 'Suspicious Email Warning'}
      </span>
    </div>
    <h1>Security Warning: Suspicious Email Detected</h1>
    <p>Brightloop Phish Security System flagged an incoming email addressed to your account as a potential phishing attempt. Please do not click any links, open attachments, or reply to this message.</p>

    <div class="meta-box">
      <div class="meta-row"><div class="meta-label">From:</div><div class="meta-val">${emailData.sender}</div></div>
      <div class="meta-row"><div class="meta-label">To:</div><div class="meta-val">${emailData.recipient}</div></div>
      <div class="meta-row"><div class="meta-label">Subject:</div><div class="meta-val">${emailData.subject}</div></div>
      ${emailData.attachmentNames && emailData.attachmentNames.length > 0 ? `<div class="meta-row"><div class="meta-label">Attachments:</div><div class="meta-val">${emailData.attachmentNames.join(', ')}</div></div>` : ''}
    </div>

    <div class="reason-box">
      <div class="reason-title">AI Threat Analysis (Risk Score: ${analysis.riskScore}/100)</div>
      <p style="color: #991b1b; font-size: 13px; margin: 0 0 8px 0;">${analysis.summary}</p>
      ${analysis.indicators && analysis.indicators.length > 0 ? `
        <div style="font-weight: 600; color: #991b1b; font-size: 12px;">Suspicious Indicators Identified:</div>
        <ul class="indicators-list">
          ${analysis.indicators.map(ind => `<li>${ind}</li>`).join('')}
        </ul>
      ` : ''}
    </div>

    <p style="font-size: 13px; color: #64748b;">This security alert was automatically generated and dispatched to your mailbox with a CC copy sent to corporate IT security (${companySupportMail}).</p>

    <div class="footer">
      Brightloop Technologies Security Operations Center &bull; Enterprise Phish Defense
    </div>
  </div>
</body>
</html>
`;

    try {
      if (this.mailSender.enabled) {
        await this.mailSender.send('phishing_alert', {
          to: employeeEmail,
          cc: companySupportMail,
          subject: `[SECURITY ALERT] ${analysis.riskLevel.toUpperCase()}: ${emailData.subject}`,
          html: htmlContent,
        });
        this.logger.log(`Phishing alert email sent to ${employeeEmail} (CC: ${companySupportMail})`);
      } else {
        this.logger.warn(`Mailer not enabled. Phishing alert email to ${employeeEmail} skipped.`);
      }
    } catch (e: any) {
      this.logger.error(`Failed to send phishing alert email: ${e.message}`);
    }
  }

  // Send single System Error email (without per-email details)
  async sendSystemErrorEmail(errorMsg: string) {
    const serverConfig = this.config.server || {};
    const companySupportMail = serverConfig.supportEmail || serverConfig.email || 'support@brightloop.local';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fca5a5; padding: 28px; box-shadow: 0 4px 12px rgba(239,68,68,0.08); }
    .badge { display: inline-block; background: #ef4444; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
    h1 { font-size: 20px; font-weight: 700; color: #991b1b; margin: 16px 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; }
    .error-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; margin: 16px 0; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #991b1b; }
    .footer { border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Phish System Alert</span>
    <h1>AI Email Inspection System Error</h1>
    <p>The Phish AI Defense system encountered a service error during background email inspection:</p>
    <div class="error-box">${errorMsg}</div>
    <p>The system is automatically retrying every 5 minutes. No individual email alert notifications will be dispatched while this system error persists. You will receive a resolution email once normal operation resumes.</p>
    <div class="footer">Occurred at: ${new Date().toLocaleString()} &bull; Brightloop Phish Defense Operations</div>
  </div>
</body>
</html>
`;

    try {
      if (this.mailSender.enabled) {
        await this.mailSender.send('phishing_alert', {
          to: companySupportMail,
          subject: `[Phish System Alert] Inspection System Error: ${errorMsg.slice(0, 60)}`,
          html: htmlContent,
        });
        this.logger.log(`System Error email sent to ${companySupportMail}`);
      }
    } catch (e: any) {
      this.logger.error(`Error sending system error email: ${e.message}`);
    }
  }

  // Send single System Resolved email upon recovery
  async sendSystemResolvedEmail(previousErrorMsg: string) {
    const serverConfig = this.config.server || {};
    const companySupportMail = serverConfig.supportEmail || serverConfig.email || 'support@brightloop.local';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'IBM Plex Sans', -apple-system, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #86efac; padding: 28px; box-shadow: 0 4px 12px rgba(34,197,94,0.08); }
    .badge { display: inline-block; background: #16a34a; color: #ffffff; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
    h1 { font-size: 20px; font-weight: 700; color: #15803d; margin: 16px 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #475569; }
    .resolved-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px; margin: 16px 0; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #15803d; }
    .footer { border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 14px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Phish System Restored</span>
    <h1>Inspection System Resolved &amp; Operational</h1>
    <p>The Phish AI Email Defense system has successfully recovered and resumed normal operation.</p>
    <div class="resolved-box">Previous Error Resolved: ${previousErrorMsg}</div>
    <p>All queued incoming emails are being processed with Gemini AI threat analysis.</p>
    <div class="footer">Resolved at: ${new Date().toLocaleString()} &bull; Brightloop Phish Defense Operations</div>
  </div>
</body>
</html>
`;

    try {
      if (this.mailSender.enabled) {
        await this.mailSender.send('phishing_alert', {
          to: companySupportMail,
          subject: `[Phish System Restored] Inspection System Resolved & Operational`,
          html: htmlContent,
        });
        this.logger.log(`System Resolved email sent to ${companySupportMail}`);
      }
    } catch (e: any) {
      this.logger.error(`Error sending system resolved email: ${e.message}`);
    }
  }

  async getUserById(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
    });
  }

  // Get all monitored users with counts
  async getMonitoredUsers() {
    const users = await this.db.phishMonitoredUser.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            emails: true,
            incidents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  // Fetch & sync recent messages from Microsoft Graph API into Phish Email Queue
  async syncUserMicrosoftEmails(userId: string, topCount = 50): Promise<void> {
    const monitoredUser = await this.db.phishMonitoredUser.findUnique({
      where: { userId },
    });

    if (!monitoredUser) return;

    const creds = this.getCredentials();
    if (!creds.enabled || !creds.tenantId || !creds.clientId || !creds.clientSecret) {
      return;
    }

    try {
      // 1. Get access token
      const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      });

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!tokenRes.ok) return;

      const tokenData: any = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // 2. Fetch messages from MS Graph Inbox (top 50 recent incoming messages)
      const msgUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(monitoredUser.email)}/messages?$top=${topCount}&$select=id,sender,subject,bodyPreview,hasAttachments,receivedDateTime&$orderby=receivedDateTime desc`;
      const msgRes = await fetch(msgUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!msgRes.ok) {
        this.logger.warn(`Failed to fetch MS Graph messages for ${monitoredUser.email}: ${msgRes.statusText}`);
        return;
      }

      const msgData: any = await msgRes.json();
      const msgs = msgData.value || [];

      // 3. For each fetched message, check if already in phishEmailQueue
      for (const msg of msgs) {
        const msMessageId = msg.id;
        const existing = await this.db.phishEmailQueue.findFirst({
          where: {
            monitoredUserId: monitoredUser.id,
            messageId: msMessageId,
          },
        });

        if (!existing) {
          const senderEmail = msg.sender?.emailAddress?.address || 'unknown@domain.com';
          const subject = msg.subject || '(No Subject)';
          const bodySnippet = msg.bodyPreview || '';

          // Ingest email and run AI inspection
          await this.ingestEmail({
            userEmail: monitoredUser.email,
            sender: senderEmail,
            recipient: monitoredUser.email,
            subject,
            bodySnippet,
            messageId: msMessageId,
            attachmentNames: msg.hasAttachments ? ['Attachment'] : [],
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error syncing MS Graph emails for ${monitoredUser.email}: ${err.message}`);
    }
  }

  // Get user email queue history
  async getUserInspectionQueue(userId: string) {
    const monitoredUser = await this.db.phishMonitoredUser.findUnique({
      where: { userId },
    });

    if (!monitoredUser) return [];

    // Automatically sync latest emails from Microsoft Graph API
    await this.syncUserMicrosoftEmails(userId);

    const queue = await this.db.phishEmailQueue.findMany({
      where: { monitoredUserId: monitoredUser.id },
      include: {
        incident: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return queue;
  }

  // Get all email inspection queue items across all users
  async getAllInspectionQueue() {
    return this.db.phishEmailQueue.findMany({
      include: {
        incident: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get overall incidents
  async getIncidents() {
    return this.db.phishIncident.findMany({
      include: {
        monitoredUser: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        emailQueue: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
