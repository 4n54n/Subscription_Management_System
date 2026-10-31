import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';

import { WorkspaceRole } from '../permission';
import type { CreateRoomInput, RoomPermissions } from './types';
import { DEFAULT_GEMINI_MODEL } from './types';
import { GeminiProxyService } from './gemini.service';

import { Config } from '../../base';
import { ServerService } from '../config';
import { MailSender } from '../mail';
import { generateAgoraRtcToken } from './agora-token';
import { CalendarInvitationService } from './calendar-invitation.service';

const generateToken = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  24
);

@Injectable()
export class PresentationService {
  private readonly logger = new Logger(PresentationService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly geminiService: GeminiProxyService,
    private readonly config: Config,
    private readonly serverService: ServerService,
    private readonly mailSender: MailSender,
    private readonly calendarService: CalendarInvitationService
  ) {}

  async getAgoraRtcToken(channelName: string, uid: number) {
    let agoraConfig = (this.config as any).agora || {};
    try {
      const dbOverrides = await this.serverService.loadDbOverrides();
      if (dbOverrides?.agora) {
        agoraConfig = { ...agoraConfig, ...dbOverrides.agora };
      }
    } catch (err) {
      this.logger.warn('[Agora] Failed to load DB overrides:', err);
    }

    let rawAppId = (agoraConfig.appId || '').replace(/['"\s]/g, '').trim();
    if (!rawAppId || rawAppId === 'YOUR_AGORA_APP_ID' || rawAppId.includes('YOUR_AGORA')) {
      rawAppId = (process.env.AGORA_APP_ID || process.env.VITE_AGORA_APP_ID || '').replace(/['"\s]/g, '').trim();
    }
    const appId =
      rawAppId &&
      rawAppId !== 'YOUR_AGORA_APP_ID' &&
      !rawAppId.includes('YOUR_AGORA')
        ? rawAppId
        : '';

    let rawCert = (agoraConfig.appCertificate || '').replace(/['"\s]/g, '').trim();
    if (!rawCert) {
      rawCert = (process.env.AGORA_APP_CERTIFICATE || '').replace(/['"\s]/g, '').trim();
    }
    const appCertificate = rawCert;

    const token = generateAgoraRtcToken(
      appId,
      appCertificate,
      channelName,
      uid
    );

    return {
      appId,
      token,
    };
  }

  /**
   * Verify that a given user is the Owner or Admin of a workspace.
   */
  async assertWorkspaceOwner(
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const role = await this.prisma.workspaceUserRole.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { type: true },
    });

    if (
      !role ||
      (role.type !== WorkspaceRole.Owner && role.type !== WorkspaceRole.Admin)
    ) {
      throw new ForbiddenException(
        'Only the Workspace Owner or Admin can manage presentations'
      );
    }
  }

  async createRoom(hostUserId: string, input: CreateRoomInput) {
    await this.assertWorkspaceOwner(input.workspaceId, hostUserId);

    const inviteToken = generateToken();
    const permissions: RoomPermissions = {
      allowGemini: input.permissions.allowGemini ?? false,
      allowVideo: input.permissions.allowVideo ?? false,
      allowAudio: input.permissions.allowAudio ?? false,
      allowScreenShare: input.permissions.allowScreenShare ?? false,
      allowWithoutPermission: input.permissions.allowWithoutPermission ?? true,
      allowTranslation: input.permissions.allowTranslation ?? false,
      allowGuestVideo: input.permissions.allowGuestVideo ?? input.permissions.allowVideo ?? false,
      allowGuestAudio: input.permissions.allowGuestAudio ?? input.permissions.allowAudio ?? false,
      allowGuestScreenShare: input.permissions.allowGuestScreenShare ?? input.permissions.allowScreenShare ?? false,
      allowGuestTranslation: input.permissions.allowGuestTranslation ?? input.permissions.allowTranslation ?? false,
      apiKey: input.permissions.apiKey,
      lockContentFor: input.permissions.lockContentFor,
      limitOutput: input.permissions.limitOutput,
      privateChat: input.permissions.privateChat,
      sshHost: input.permissions.sshHost,
      sshUser: input.permissions.sshUser,
      sshPass: input.permissions.sshPass,
      title: input.permissions.title,
      description: input.permissions.description,
      startTime: input.permissions.startTime,
      endTime: input.permissions.endTime,
      timezone: input.permissions.timezone,
      invitedEmails: input.permissions.invitedEmails,
    };

    const room = await this.prisma.presentationRoom.create({
      data: {
        workspaceId: input.workspaceId,
        docId: input.docId,
        hostUserId,
        inviteToken,
        permissions: permissions as any,
        geminiModel: input.geminiModel ?? DEFAULT_GEMINI_MODEL,
        status: 'active',
      },
    });

    this.logger.log(
      `Room created: ${room.id} by host ${hostUserId} for doc ${input.docId}`
    );
    return room;
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.presentationRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      throw new NotFoundException(`Presentation room ${roomId} not found`);
    }
    return room;
  }

  async getRoomByToken(inviteToken: string) {
    const room = await this.prisma.presentationRoom.findUnique({
      where: { inviteToken },
    });
    if (!room) {
      throw new NotFoundException('Presentation room not found');
    }
    return room;
  }

  async joinGuest(inviteToken: string, name: string, existingUserId?: string) {
    const room = await this.getRoomByToken(inviteToken);
    if (room.status !== 'active') {
      throw new BadRequestException('Room is not active');
    }

    if (!/^[A-Za-z\s]+$/.test(name)) {
      throw new BadRequestException('Name is not allowed for security reasons. Only letters and spaces are allowed.');
    }

    let user = null;
    if (existingUserId) {
      user = await this.prisma.user.findUnique({
        where: { id: existingUserId },
      });
      if (user && !user.email.endsWith('@guest.presentation')) {
        user = null;
      }
    }

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    } else {
      const email = `guest-${room.inviteToken}-${Date.now()}@guest.presentation`;
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          registered: false,
        },
      });
    }

    const existingSession =
      await this.prisma.presentationGuestSession.findFirst({
        where: {
          userId: user.id,
          roomId: room.id,
        },
      });

    if (!existingSession) {
      await this.prisma.presentationGuestSession.create({
        data: {
          userId: user.id,
          roomId: room.id,
          inviteToken,
        },
      });
    }

    return user;
  }

  async endRoom(roomId: string, requestingUserId: string) {
    const room = await this.getRoom(roomId);

    if (room.hostUserId !== requestingUserId) {
      throw new ForbiddenException('Only the host can end the meeting');
    }

    if (room.status === 'ended') {
      throw new BadRequestException('Room is already ended');
    }

    // Clean up temporary guest users!
    const guestSessions = await this.prisma.presentationGuestSession.findMany({
      where: { roomId },
      select: { userId: true },
    });
    const guestIds = guestSessions.map(s => s.userId);

    await this.prisma.presentationGuestSession.deleteMany({
      where: { roomId },
    });

    if (guestIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: {
          id: { in: guestIds },
        },
      });
    }

    // Delete temporary document records and snapshots completely from the database
    const tempDocId = `temp-${roomId}`;
    await this.prisma.workspaceDoc
      .deleteMany({
        where: { workspaceId: room.workspaceId, docId: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete workspace doc ${tempDocId}`, err)
      );
    await this.prisma.snapshot
      .deleteMany({
        where: { workspaceId: room.workspaceId, id: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete snapshot ${tempDocId}`, err)
      );
    await this.prisma.update
      .deleteMany({
        where: { workspaceId: room.workspaceId, id: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete update ${tempDocId}`, err)
      );
    await this.prisma.snapshotHistory
      .deleteMany({
        where: { workspaceId: room.workspaceId, id: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete snapshot history ${tempDocId}`, err)
      );

    return this.prisma.presentationRoom.update({
      where: { id: roomId },
      data: { status: 'ended', endedAt: new Date() },
    });
  }

  async listRooms(workspaceId: string, hostUserId: string) {
    const rooms = await this.prisma.presentationRoom.findMany({
      where: { workspaceId, hostUserId },
      orderBy: { createdAt: 'desc' },
    });

    const hostUserIds = Array.from(new Set(rooms.map(r => r.hostUserId)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: hostUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return rooms.map(room => ({
      ...room,
      hostUser: userMap.get(room.hostUserId) || null,
    }));
  }

  async deleteRoom(roomId: string, requestingUserId: string) {
    const room = await this.getRoom(roomId);
    if (room.hostUserId !== requestingUserId) {
      throw new ForbiddenException('Only the host can delete this room');
    }

    // Clean up guest users!
    const guestSessions = await this.prisma.presentationGuestSession.findMany({
      where: { roomId },
      select: { userId: true },
    });
    const guestIds = guestSessions.map(s => s.userId);

    await this.prisma.presentationGuestSession.deleteMany({
      where: { roomId },
    });

    if (guestIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: {
          id: { in: guestIds },
        },
      });
    }

    // Delete temporary document records and snapshots completely from the database
    const tempDocId = `temp-${roomId}`;
    await this.prisma.workspaceDoc
      .deleteMany({
        where: { workspaceId: room.workspaceId, docId: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete workspace doc ${tempDocId}`, err)
      );
    await this.prisma.snapshot
      .deleteMany({
        where: { workspaceId: room.workspaceId, id: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete snapshot ${tempDocId}`, err)
      );
    await this.prisma.update
      .deleteMany({
        where: { workspaceId: room.workspaceId, id: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete update ${tempDocId}`, err)
      );
    await this.prisma.snapshotHistory
      .deleteMany({
        where: { workspaceId: room.workspaceId, id: tempDocId },
      })
      .catch(err =>
        this.logger.error(`Failed to delete snapshot history ${tempDocId}`, err)
      );

    await this.prisma.presentationRoom.delete({ where: { id: roomId } });
  }

  async listGeminiModels(workspaceId?: string, customApiKey?: string) {
    let dbApiKey: string | undefined;
    if (workspaceId) {
      const setting = await this.prisma.workspaceGeminiSetting.findUnique({
        where: { workspaceId },
      });
      if (setting?.apiKey) {
        dbApiKey = setting.apiKey;
      }
    }
    const globalConfig = this.serverService.getConfig();
    const globalKey = globalConfig.copilot?.providers?.gemini?.apiKey;
    return this.geminiService.listModels(customApiKey || dbApiKey || globalKey);
  }

  async geminiChat(workspaceId: string, prompt: string) {
    const setting = await this.prisma.workspaceGeminiSetting.findUnique({
      where: { workspaceId },
    });
    const globalConfig = this.serverService.getConfig();
    const dbOverrides = this.serverService.getDbOverrides();
    const keyToUse =
      (setting?.apiKey && setting.apiKey.trim()) ||
      (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey ||
      globalConfig.copilot?.providers?.gemini?.apiKey ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_GEMINI_API_KEY'] ||
      undefined;

    const modelToUse = (
      setting?.meetingModel ||
      setting?.model ||
      (dbOverrides as any)?.copilot?.researchDocModel ||
      (dbOverrides as any)?.copilot?.providers?.gemini?.model ||
      globalConfig.copilot?.researchDocModel ||
      globalConfig.copilot?.providers?.gemini?.model ||
      DEFAULT_GEMINI_MODEL
    ).replace(/^models\//i, '').trim();
    const limitOutput = setting?.limitOutput || false;

    return this.geminiService.chat(
      workspaceId,
      'project-copilot',
      prompt,
      modelToUse,
      keyToUse,
      limitOutput
    );
  }

  async translateSpeech(
    text: string,
    targetLang: string,
    sourceLang?: string,
    workspaceId?: string
  ) {
    if (!text || !text.trim()) {
      return { translatedText: '' };
    }

    const languageNames: Record<string, string> = {
      af: 'Afrikaans',
      sq: 'Albanian',
      am: 'Amharic',
      ar: 'Arabic',
      hy: 'Armenian',
      az: 'Azerbaijani',
      eu: 'Basque',
      bn: 'Bengali',
      bs: 'Bosnian',
      bg: 'Bulgarian',
      my: 'Burmese (Myanmar)',
      ca: 'Catalan',
      zh: 'Chinese (Simplified)',
      'zh-cn': 'Chinese (Simplified)',
      'zh-tw': 'Chinese (Traditional)',
      hr: 'Croatian',
      cs: 'Czech',
      da: 'Danish',
      nl: 'Dutch',
      en: 'English',
      'en-us': 'English (US)',
      'en-gb': 'English (UK)',
      et: 'Estonian',
      fil: 'Filipino (Tagalog)',
      tl: 'Filipino (Tagalog)',
      fi: 'Finnish',
      fr: 'French',
      'fr-ca': 'French (Canada)',
      gl: 'Galician',
      ka: 'Georgian',
      de: 'German',
      el: 'Greek',
      gu: 'Gujarati',
      he: 'Hebrew',
      hi: 'Hindi',
      hu: 'Hungarian',
      is: 'Icelandic',
      id: 'Indonesian',
      it: 'Italian',
      ja: 'Japanese',
      kn: 'Kannada',
      kk: 'Kazakh',
      km: 'Khmer',
      ko: 'Korean',
      lo: 'Lao',
      lv: 'Latvian',
      lt: 'Lithuanian',
      mk: 'Macedonian',
      ms: 'Malay',
      ml: 'Malayalam',
      mr: 'Marathi',
      mn: 'Mongolian',
      ne: 'Nepali',
      no: 'Norwegian',
      fa: 'Persian (Farsi)',
      pl: 'Polish',
      pt: 'Portuguese',
      'pt-br': 'Portuguese (Brazil)',
      'pt-pt': 'Portuguese (Portugal)',
      pa: 'Punjabi',
      ro: 'Romanian',
      ru: 'Russian',
      sr: 'Serbian',
      si: 'Sinhala',
      sk: 'Slovak',
      sl: 'Slovenian',
      so: 'Somali',
      es: 'Spanish',
      'es-419': 'Spanish (Latin America)',
      sw: 'Swahili',
      sv: 'Swedish',
      ta: 'Tamil',
      te: 'Telugu',
      th: 'Thai',
      tr: 'Turkish',
      uk: 'Ukrainian',
      ur: 'Urdu',
      uz: 'Uzbek',
      vi: 'Vietnamese',
      cy: 'Welsh',
      zu: 'Zulu',
    };

    const targetLangName = languageNames[targetLang?.toLowerCase()] || targetLang || 'English';

    if (sourceLang && sourceLang.toLowerCase() === targetLang?.toLowerCase()) {
      return { translatedText: text, targetLang };
    }

    try {
      const dbOverrides = this.serverService.getDbOverrides();
      const globalConfig = this.serverService.getConfig();
      let keyToUse =
        (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey ||
        globalConfig.copilot?.providers?.gemini?.apiKey ||
        process.env['GEMINI_API_KEY'] ||
        process.env['GOOGLE_GEMINI_API_KEY'] ||
        undefined;

      if (workspaceId) {
        const setting = await this.prisma.workspaceGeminiSetting.findUnique({
          where: { workspaceId },
        });
        if (setting?.apiKey && setting.apiKey.trim()) {
          keyToUse = setting.apiKey.trim();
        }
      }

      const prompt = `Translate the following spoken sentence into ${targetLangName}. Preserve conversational flow. Respond ONLY with the direct translation text and nothing else:\n\n"${text}"`;

      const res = await this.geminiService.chat(
        workspaceId || 'system',
        'translation',
        prompt,
        DEFAULT_GEMINI_MODEL,
        keyToUse,
        true
      );

      const translatedText =
        (typeof res === 'string' ? res : (res as any)?.reply)
          ?.trim()
          ?.replace(/^["']|["']$/g, '') || text;
      return { translatedText, targetLang };
    } catch (err) {
      this.logger.warn(`[Translate] Translation error for ${targetLang}:`, err);
      return { translatedText: text, targetLang, fallback: true };
    }
  }

  async getWorkspaceMembers(workspaceId: string) {
    const userRoles = await this.prisma.workspaceUserRole.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return userRoles
      .filter(ur => ur.user && ur.user.email)
      .map(ur => ({
        id: ur.user.id,
        name: ur.user.name || ur.user.email.split('@')[0],
        email: ur.user.email,
        avatarUrl: ur.user.avatarUrl,
        role: ur.type,
      }));
  }

  async sendRoomInvitations(
    hostUserId: string,
    input: {
      workspaceId: string;
      inviteToken: string;
      docId?: string;
      emails: string[];
      note?: string;
    }
  ) {
    if (!input.emails || input.emails.length === 0) {
      return { success: true, count: 0 };
    }

    const hostUser = await this.prisma.user.findUnique({
      where: { id: hostUserId },
      select: { id: true, name: true, email: true },
    });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { id: true, name: true },
    });

    let docTitle = 'Live Presentation';
    if (input.docId) {
      const doc = await this.prisma.workspaceDoc.findFirst({
        where: { workspaceId: input.workspaceId, docId: input.docId },
        select: { title: true },
      });
      if (doc?.title) docTitle = doc.title;
    }

    const serverCfg = (this.config as any)?.server || {};
    const origin =
      serverCfg.externalUrl ||
      (serverCfg.host
        ? `${serverCfg.https ? 'https' : 'http'}://${serverCfg.host}${
            serverCfg.port && serverCfg.port !== 80 && serverCfg.port !== 443
              ? `:${serverCfg.port}`
              : ''
          }`
        : '');
    const baseUrl = origin || process.env.PUBLIC_URL || 'http://localhost:8080';
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/join/${input.inviteToken}`;

    try {
      const activeServerConfig = this.serverService?.getConfig()?.server;
      if (activeServerConfig) {
        (globalThis as any).serverConfig = activeServerConfig;
      }
    } catch {
      // ignore
    }

    const { Renderers } = await import('../../mails');

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default
    const eventUid = `meeting-${input.inviteToken}@intoai.app`;

    const icsContent = this.calendarService.generateICSPayload({
      uid: eventUid,
      sequence: 0,
      method: 'REQUEST',
      status: 'CONFIRMED',
      summary: `Meeting: ${docTitle}`,
      description: input.note || `Live presentation meeting for ${docTitle}`,
      location: inviteUrl,
      startDate,
      endDate,
      organizer: {
        name: hostUser?.name || 'Workspace Host',
        email: hostUser?.email || 'noreply@intoai.app',
      },
      attendees: input.emails.map(email => ({ email })),
    });

    let sentCount = 0;
    for (const toEmail of input.emails) {
      const trimmed = toEmail.trim();
      if (!trimmed) continue;

      try {
        const mailData = await Renderers.MeetingInvitation({
          user: {
            name: hostUser?.name || 'Workspace Host',
            email: hostUser?.email || '',
          },
          workspace: {
            name: workspace?.name || 'Workspace',
          },
          docTitle,
          url: inviteUrl,
          note: input.note,
        });

        await this.mailSender.send('MeetingInvitation', {
          to: trimmed,
          ...mailData,
          icalEvent: {
            filename: 'invite.ics',
            method: 'REQUEST',
            content: icsContent,
          },
        } as any);
        sentCount++;
      } catch (err) {
        this.logger.error(`Failed to send invitation to ${trimmed}`, err);
      }
    }

    return { success: true, count: sentCount };
  }

  async updateRoom(hostUserId: string, roomId: string, input: any) {
    const room = await this.getRoom(roomId);
    if (room.hostUserId !== hostUserId) {
      throw new ForbiddenException('Only the host can update this room');
    }

    const currentPermissions = (room.permissions as any) || {};
    const updatedPermissions = {
      ...currentPermissions,
      title: input.title ?? currentPermissions.title,
      description: input.description ?? currentPermissions.description,
      startTime: input.startTime ?? currentPermissions.startTime,
      endTime: input.endTime ?? currentPermissions.endTime,
      timezone: input.timezone ?? currentPermissions.timezone,
      invitedEmails: input.invitedEmails ?? currentPermissions.invitedEmails,
      allowTranslation: input.allowTranslation ?? currentPermissions.allowTranslation,
      allowGuestTranslation:
        input.allowGuestTranslation ??
        input.allowTranslation ??
        currentPermissions.allowGuestTranslation,
    };

    return this.prisma.presentationRoom.update({
      where: { id: roomId },
      data: {
        permissions: updatedPermissions as any,
      },
    });
  }

  async cancelRoom(hostUserId: string, roomId: string, input: { workspaceId?: string; inviteToken?: string; docId?: string; emails?: string[]; note?: string }) {
    const room = await this.getRoom(roomId);
    if (room.hostUserId !== hostUserId) {
      throw new ForbiddenException('Only the host can cancel this room');
    }

    const hostUser = await this.prisma.user.findUnique({
      where: { id: hostUserId },
      select: { name: true, email: true },
    });

    const recipientEmails = (input.emails && input.emails.length > 0)
      ? input.emails
      : ((room.permissions as any)?.invitedEmails || []);

    if (recipientEmails.length > 0) {
      try {
        const { Renderers } = await import('../../mails');
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const eventUid = `meeting-${room.inviteToken}@intoai.app`;

        const cancelIcsContent = this.calendarService.generateICSPayload({
          uid: eventUid,
          sequence: 1,
          method: 'CANCEL',
          status: 'CANCELLED',
          summary: `CANCELLED: Presentation Meeting`,
          description: input.note || `This presentation meeting has been cancelled by the host.`,
          location: '',
          startDate,
          endDate,
          organizer: {
            name: hostUser?.name || 'Workspace Host',
            email: hostUser?.email || 'noreply@intoai.app',
          },
          attendees: recipientEmails.map((email: string) => ({ email })),
        });

        for (const toEmail of recipientEmails) {
          const trimmed = toEmail.trim();
          if (!trimmed) continue;
          try {
            const mailData = await Renderers.MeetingInvitation({
              user: {
                name: hostUser?.name || 'Workspace Host',
                email: hostUser?.email || '',
              },
              workspace: {
                name: 'Workspace',
              },
              docTitle: 'CANCELLED Presentation Meeting',
              url: '#',
              note: input.note || `This presentation meeting has been CANCELLED by the host.`,
            });

            await this.mailSender.send('MeetingInvitation', {
              to: trimmed,
              ...mailData,
              subject: `Cancelled: Presentation Meeting`,
              icalEvent: {
                filename: 'cancel.ics',
                method: 'CANCEL',
                content: cancelIcsContent,
              },
            } as any);
          } catch (e) {
            this.logger.error(`Failed to send cancellation email to ${trimmed}`, e);
          }
        }
      } catch (err) {
        this.logger.error('Failed to send room cancellation emails', err);
      }
    }

    return this.prisma.presentationRoom.update({
      where: { id: roomId },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });
  }

  /**
   * Admin Cleanup: Get statistics for temporary guest accounts, cloned pages for ended meetings,
   * and Docker containers created by meeting terminal buttons.
   */
  async getMeetingCleanupStats() {
    // 1. Temporary guest accounts count
    const tempAccounts = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'guest.presentation' } },
          { email: { contains: '@guest' } },
        ],
      },
      select: { id: true },
    });
    const tempAccountsCount = tempAccounts.length;

    // 2. Cloned meeting pages for ended meetings
    // Cloned docs have docId starting with "temp-"
    const tempDocs = await this.prisma.workspaceDoc.findMany({
      where: {
        docId: { startsWith: 'temp-' },
      },
      select: { docId: true, workspaceId: true },
    });

    const roomIds = tempDocs.map(d => d.docId.replace('temp-', ''));
    const rooms = await this.prisma.presentationRoom.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, status: true, endedAt: true, workspaceId: true },
    });
    const roomMap = new Map(rooms.map(r => [r.id, r]));

    const endedClonedPages = tempDocs.filter(d => {
      const roomId = d.docId.replace('temp-', '');
      const room = roomMap.get(roomId);
      // Only include if matching meeting exists and status is marked as ended by host
      return room && room.status === 'ended';
    });

    // 3. Docker containers created for meeting terminals
    let containers: Array<{
      id: string;
      name: string;
      roomId: string | null;
      status: string;
      created: string;
      isMeetingEnded: boolean;
      roomStatus: string | null;
    }> = [];

    try {
      const stdout = execSync(
        'docker ps -a --format "{{json .}}"',
        { encoding: 'utf-8', timeout: 5000 }
      );
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);

      // Collect roomIds from containers to query DB
      const containerRoomIds = new Set<string>();
      const parsedContainers: Array<{
        id: string;
        name: string;
        labels: string;
        image: string;
        status: string;
        created: string;
        roomId: string | null;
      }> = [];

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          const name = item.Names || item.names || '';
          const labels = item.Labels || item.labels || '';
          const image = item.Image || item.image || '';
          const id = item.ID || item.id || '';
          const status = item.Status || item.status || '';
          const created = item.CreatedAt || item.created || item.Created || '';

          // Filter for meeting terminal sandbox containers
          const isMeetingContainer =
            labels.includes('app=meeting-sandbox') ||
            name.includes('meeting-sandbox-') ||
            image.includes('intoai/sandbox');

          if (isMeetingContainer) {
            let roomId: string | null = null;
            // Try label roomId=...
            const labelMatch = labels.match(/roomId=([^,\s]+)/);
            if (labelMatch) {
              roomId = labelMatch[1];
            } else {
              // Fallback to name meeting-sandbox-<roomId>-...
              const nameMatch = name.match(/meeting-sandbox-([a-f0-9\-]{10,})/i);
              if (nameMatch) {
                roomId = nameMatch[1];
              }
            }

            if (roomId) containerRoomIds.add(roomId);
            parsedContainers.push({
              id,
              name,
              labels,
              image,
              status,
              created,
              roomId,
            });
          }
        } catch (_) {
          // ignore line parse errors
        }
      }

      const containerRooms = await this.prisma.presentationRoom.findMany({
        where: { id: { in: Array.from(containerRoomIds) } },
        select: { id: true, status: true },
      });
      const containerRoomMap = new Map(containerRooms.map(r => [r.id, r.status]));

      containers = parsedContainers.map(c => {
        const roomStatus = c.roomId ? containerRoomMap.get(c.roomId) || null : null;
        // If room is ended OR room no longer exists, meeting is ended -> eligible to delete.
        // If room status is 'active', meeting is active -> NOT eligible to delete.
        const isMeetingEnded = roomStatus ? roomStatus === 'ended' : true;
        return {
          id: c.id,
          name: c.name,
          roomId: c.roomId,
          status: c.status,
          created: c.created,
          isMeetingEnded,
          roomStatus,
        };
      });
    } catch (dockerErr) {
      this.logger.warn('[Cleanup] Failed to query Docker containers:', dockerErr);
    }

    const endedContainersCount = containers.filter(c => c.isMeetingEnded).length;

    return {
      tempAccountsCount,
      clonedPagesCount: endedClonedPages.length,
      endedContainersCount,
      containers,
    };
  }

  /**
   * Delete all cloned pages (temp-docId) where the presentation meeting status is 'ended'.
   */
  /**
   * Delete all cloned pages (temp-docId) where the presentation meeting status is 'ended' or orphaned.
   */
  async deleteEndedMeetingClonedPages() {
    const tempDocs = await this.prisma.workspaceDoc.findMany({
      where: { docId: { startsWith: 'temp-' } },
      select: { docId: true, workspaceId: true },
    });

    if (tempDocs.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const roomIds = tempDocs.map(d => d.docId.replace('temp-', ''));
    const rooms = await this.prisma.presentationRoom.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, status: true },
    });

    const roomStatusMap = new Map(rooms.map(r => [r.id, r.status]));
    let deletedCount = 0;

    for (const doc of tempDocs) {
      const roomId = doc.docId.replace('temp-', '');
      const status = roomStatusMap.get(roomId);
      
      // Delete if meeting is ended OR if meeting record no longer exists (orphaned clone)
      if (!status || status === 'ended') {
        const tempDocId = doc.docId;
        await this.prisma.workspaceDoc
          .deleteMany({ where: { docId: tempDocId } })
          .catch(() => {});
        await this.prisma.snapshot
          .deleteMany({ where: { id: tempDocId } })
          .catch(() => {});
        await this.prisma.update
          .deleteMany({ where: { id: tempDocId } })
          .catch(() => {});
        await this.prisma.snapshotHistory
          .deleteMany({ where: { id: tempDocId } })
          .catch(() => {});

        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  }

  /**
   * Delete Docker containers associated with meetings marked as 'ended' by host (or orphaned).
   */
  async deleteEndedMeetingContainers() {
    const stats = await this.getMeetingCleanupStats();
    const containersToDelete = stats.containers.filter(c => c.isMeetingEnded);

    let deletedCount = 0;
    for (const container of containersToDelete) {
      try {
        execSync(`docker rm -f ${container.id}`, { encoding: 'utf-8', timeout: 5000 });
        deletedCount++;
      } catch (err) {
        this.logger.error(`Failed to remove Docker container ${container.id}:`, err);
      }
    }

    return { success: true, deletedCount };
  }

  /**
   * Delete a single Docker container by container ID.
   */
  async deleteSingleContainer(containerId: string) {
    if (!containerId || typeof containerId !== 'string') {
      throw new Error('Invalid container ID specified');
    }
    const cleanId = containerId.replace(/[^a-zA-Z0-9_\-]/g, '');
    try {
      execSync(`docker rm -f ${cleanId}`, { encoding: 'utf-8', timeout: 5000 });
      return { success: true, message: `Container ${cleanId} removed` };
    } catch (err: any) {
      this.logger.error(`Failed to remove Docker container ${cleanId}:`, err);
      throw new Error(`Failed to remove Docker container: ${err?.message || err}`);
    }
  }

  /**
   * Clear all temporary guest accounts created for presentation rooms.
   */
  async clearTempGuestAccounts() {
    const guestUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'guest.presentation' } },
          { email: { contains: '@guest' } },
        ],
      },
      select: { id: true },
    });

    const guestIds = guestUsers.map(u => u.id);
    if (guestIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    await this.prisma.presentationGuestSession.deleteMany({
      where: { userId: { in: guestIds } },
    });

    const deletedResult = await this.prisma.user.deleteMany({
      where: { id: { in: guestIds } },
    });

    return { success: true, deletedCount: deletedResult.count };
  }
}
