import {
  BadRequestException,
  BeforeApplicationShutdown,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Optional,
  Param,
  Post,
  Query,
  Req,
  Res,
  Sse,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  connect,
  EMPTY,
  filter,
  finalize,
  from,
  interval,
  lastValueFrom,
  map,
  merge,
  mergeMap,
  Observable,
  Subject,
  take,
  takeUntil,
  toArray,
} from 'rxjs';

import {
  BlobNotFound,
  CallMetric,
  Config,
  CopilotFailedToGenerateText,
  CopilotSessionNotFound,
  InternalServerError,
  mapAnyError,
  mapSseError,
  metrics,
  NoCopilotProviderAvailable,
  UnsplashIsNotConfigured,
} from '../../base';
import { CurrentUser, Public } from '../../core/auth';
import {
  CopilotCapability,
  CopilotProviderFactory,
  CopilotProviderType,
  CopilotTextProvider,
} from './providers';
import { ChatSession, ChatSessionService } from './session';
import { CopilotStorage } from './storage';
import { AiModelFallbackService } from '../../core/config/model-fallback.service';
import { ChatMessage } from './types';
import { CopilotWorkflowService, GraphExecutorState } from './workflow';

export interface ChatEvent {
  type: 'event' | 'attachment' | 'message' | 'error' | 'ping';
  id?: string;
  data: string | object;
}

type CheckResult = {
  model: string | undefined;
  hasAttachment?: boolean;
};

const PING_INTERVAL = 5000;

@Controller('/api/copilot')
export class CopilotController implements BeforeApplicationShutdown {
  private readonly logger = new Logger(CopilotController.name);
  private readonly ongoingStreamCount$ = new BehaviorSubject(0);

  constructor(
    private readonly config: Config,
    private readonly chatSession: ChatSessionService,
    private readonly provider: CopilotProviderFactory,
    private readonly workflow: CopilotWorkflowService,
    private readonly storage: CopilotStorage,
    private readonly prisma: PrismaClient,
    @Optional() private readonly fallbackService?: AiModelFallbackService
  ) {}

  @Public()
  @Get('/search-grounding-status')
  async getSearchGroundingStatus(
    @Query('model') model?: string
  ) {
    if (this.fallbackService) {
      return await this.fallbackService.checkModelSearchGroundingSupport(model);
    }
    return { supported: true, model: model || 'gemini-2.5-flash', methods: ['generateContent'] };
  }

  async beforeApplicationShutdown() {
    await lastValueFrom(
      this.ongoingStreamCount$.asObservable().pipe(
        filter(count => count === 0),
        take(1)
      )
    );
    this.ongoingStreamCount$.complete();
  }

  private async getSessionOrAutoCreate(
    sessionId: string,
    userId = 'anonymous'
  ): Promise<ChatSession> {
    let session = await this.chatSession.get(sessionId);
    if (!session) {
      try {
        await this.chatSession.createWithSessionId(sessionId, {
          userId,
          workspaceId: 'default',
          docId: 'default',
          promptName: 'chat:gpt',
        });
        session = await this.chatSession.get(sessionId);
      } catch (err) {
        this.logger.warn(`Failed to auto-create copilot session ${sessionId}:`, err);
      }
    }
    if (!session) {
      throw new CopilotSessionNotFound();
    }
    return session;
  }

  private async checkRequest(
    userId: string | undefined,
    sessionId: string,
    messageId?: string
  ): Promise<CheckResult> {
    const session = await this.getSessionOrAutoCreate(sessionId, userId || 'anonymous');
    const targetUserId = userId || session.config.userId;
    await this.chatSession.checkQuota(targetUserId);

    const ret: CheckResult = { model: session.model };

    if (messageId && typeof messageId === 'string') {
      try {
        const message = await session.getMessageById(messageId);
        if (message) {
          ret.hasAttachment =
            Array.isArray(message.attachments) && !!message.attachments.length;
        }
      } catch (e) {
        this.logger.warn(`Could not get message by ID ${messageId}:`, e);
      }
    }

    return ret;
  }

  private async chooseTextProvider(
    userId: string,
    sessionId: string,
    messageId?: string
  ): Promise<CopilotTextProvider> {
    const { hasAttachment, model } = await this.checkRequest(
      userId,
      sessionId,
      messageId
    );
    let provider = await this.provider.getProviderByCapability(
      CopilotCapability.TextToText,
      { model }
    );
    if (!provider) {
      provider = await this.provider.getProviderByCapability(
        CopilotCapability.TextToText
      );
    }
    // fallback to image to text if text to text is not available
    if (!provider && hasAttachment) {
      provider = await this.provider.getProviderByCapability(
        CopilotCapability.ImageToText,
        { model }
      );
    }
    if (!provider && hasAttachment) {
      provider = await this.provider.getProviderByCapability(
        CopilotCapability.ImageToText
      );
    }
    if (!provider) {
      const fallbackGemini = this.provider.getProvider(CopilotProviderType.Gemini);
      if (fallbackGemini) {
        return fallbackGemini as any;
      }
      throw new NoCopilotProviderAvailable();
    }

    return provider;
  }

  private async appendSessionMessage(
    sessionId: string,
    messageId?: string,
    retry = false,
    userId?: string
  ): Promise<[ChatMessage | undefined, ChatSession]> {
    const session = await this.getSessionOrAutoCreate(sessionId, userId || 'anonymous');

    let latestMessage = undefined;
    if (!messageId || retry) {
      // revert the latest message generated by the assistant
      // if messageId is provided, we will also revert latest user message
      await this.chatSession.revertLatestMessage(sessionId, !!messageId);
      session.revertLatestMessage(!!messageId);
      if (!messageId) {
        latestMessage = session.latestUserMessage;
      }
    }

    if (messageId) {
      try {
        await session.pushByMessageId(messageId);
      } catch (e) {
        this.logger.warn(`Failed to push message by ID ${messageId}:`, e);
      }
    }

    return [latestMessage, session];
  }

  private prepareParams(params: Record<string, string | string[]>) {
    const messageId = Array.isArray(params.messageId)
      ? params.messageId[0]
      : params.messageId;
    const retry = Array.isArray(params.retry)
      ? Boolean(params.retry[0])
      : Boolean(params.retry);
    delete params.messageId;
    delete params.retry;
    return { messageId, retry, params };
  }

  private getSignal(req: Request) {
    const controller = new AbortController();
    req.socket.on('close', () => {
      controller.abort();
    });
    return controller.signal;
  }

  private parseNumber(value: string | string[] | undefined) {
    if (!value) {
      return undefined;
    }
    const num = Number.parseInt(Array.isArray(value) ? value[0] : value, 10);
    if (Number.isNaN(num)) {
      return undefined;
    }
    return num;
  }

  private mergePingStream(
    messageId: string,
    source$: Observable<ChatEvent>
  ): Observable<ChatEvent> {
    const subject$ = new Subject();
    const ping$ = interval(PING_INTERVAL).pipe(
      map(() => ({ type: 'ping' as const, id: messageId, data: '' })),
      takeUntil(subject$)
    );

    return merge(source$.pipe(finalize(() => subject$.next(null))), ping$);
  }

  @Get('/history')
  async getCopilotHistory(
    @CurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
    @Query('sessionId') targetSessionId?: string
  ) {
    try {
      const userId = user?.id;
      if (!workspaceId || !userId) return { messages: [], sessions: [] };
      const allMessages = await (this.prisma as any).copilotChatMessage.findMany({
        where: {
          workspaceId,
          userId,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });

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

      const sessions = Array.from(sessionMap.values()).reverse();

      let messages = allMessages;
      if (targetSessionId) {
        messages = allMessages.filter((m: any) => (m.sessionId || 'default') === targetSessionId);
      } else if (sessions.length > 0) {
        messages = sessions[0].messages;
      }

      return { messages: messages || [], sessions };
    } catch (err) {
      this.logger.error('Failed to fetch copilot history', err);
      return { messages: [], sessions: [] };
    }
  }

  @Delete('/history')
  async clearCopilotHistory(
    @CurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string,
    @Query('sessionId') targetSessionId?: string
  ) {
    const userId = user?.id;
    if (!workspaceId || !userId) return { success: true };
    const whereClause: any = { workspaceId, userId };
    if (targetSessionId) {
      whereClause.sessionId = targetSessionId;
    }
    await (this.prisma as any).copilotChatMessage.deleteMany({
      where: whereClause,
    });
    return { success: true };
  }

  @Post('/chat')
  async copilotChat(
    @CurrentUser() user: CurrentUser,
    @Body()
    body: {
      workspaceId: string;
      sessionId?: string;
      message: string;
      history?: Array<{ role: string; content: string }>;
      context?: any;
    }
  ) {
    const { workspaceId, message, context } = body;
    if (!workspaceId || !message) {
      throw new BadRequestException('Workspace ID and message are required.');
    }

    const userId = user?.id || 'anonymous';
    const activeSessionId = body.sessionId || `session_${Date.now()}`;

    // Save user message to database
    await (this.prisma as any).copilotChatMessage.create({
      data: {
        workspaceId,
        userId,
        sessionId: activeSessionId,
        role: 'user',
        content: message,
      },
    });

    const activeTab = context?.activeTab || 'overview';
    const activeSubTab = context?.activeSubTab || 'overview';
    const replyText = `I have analyzed your **${activeTab}** workspace context (${activeSubTab}). All requested operations and queries can be executed directly from here!`;

    // Save assistant reply to database
    await (this.prisma as any).copilotChatMessage.create({
      data: {
        workspaceId,
        userId,
        sessionId: activeSessionId,
        role: 'assistant',
        content: replyText,
      },
    });

    return {
      reply: replyText,
      sessionId: activeSessionId,
    };
  }

  @Public()
  @Get('/chat/:sessionId')
  @CallMetric('ai', 'chat', { timer: true })
  async chat(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query() params: Record<string, string | string[]>,
    @CurrentUser() user?: CurrentUser
  ): Promise<string> {
    const info: any = { sessionId, params };

    try {
      const { messageId, retry } = this.prepareParams(params);
      const userId = user?.id || 'anonymous';
      await this.getSessionOrAutoCreate(sessionId, userId);

      const provider = await this.chooseTextProvider(
        userId,
        sessionId,
        messageId
      );

      const [latestMessage, session] = await this.appendSessionMessage(
        sessionId,
        messageId,
        retry,
        userId
      );

      info.model = session.model;
      metrics.ai.counter('chat_calls').add(1, { model: session.model });

      if (latestMessage) {
        params = Object.assign({}, params, latestMessage.params, {
          content: latestMessage.content,
          attachments: latestMessage.attachments,
        });
      }

      const finalMessage = session.finish(params);
      info.finalMessage = finalMessage.filter(m => m.role !== 'system');

      const content = await provider.generateText(finalMessage, session.model, {
        ...session.config.promptConfig,
        promptName: session.config.promptName,
        params,
        webSearch: Boolean(params?.webSearch || params?.googleSearch || (params as any)?.networkSearch || session.config.promptName === 'Search With IntoAI'),
        signal: this.getSignal(req),
        user: userId,
      });

      session.push({
        role: 'assistant',
        content,
        createdAt: new Date(),
      });
      await session.save();

      return content;
    } catch (e: any) {
      metrics.ai.counter('chat_errors').add(1);
      let error = mapAnyError(e);
      if (error instanceof InternalServerError) {
        error = new CopilotFailedToGenerateText(e.message);
      }
      error.log('CopilotChat', info);
      throw error;
    }
  }

  @Public()
  @Sse('/chat/:sessionId/stream')
  @CallMetric('ai', 'chat_stream', { timer: true })
  async chatStream(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query() params: Record<string, string>,
    @CurrentUser() user?: CurrentUser
  ): Promise<Observable<ChatEvent>> {
    this.logger.log(`[ASK_AI_DEBUG] [Backend] chatStream received for sessionId=${sessionId}, params=${JSON.stringify(params)}`);
    const info: any = { sessionId, params, throwInStream: false };

    try {
      const { messageId, retry } = this.prepareParams(params);
      const userId = user?.id || 'anonymous';
      await this.getSessionOrAutoCreate(sessionId, userId);

      const provider = await this.chooseTextProvider(
        userId,
        sessionId,
        messageId
      );

      const [latestMessage, session] = await this.appendSessionMessage(
        sessionId,
        messageId,
        retry,
        userId
      );

      info.model = session.model;
      this.logger.log(`[ASK_AI_DEBUG] [Backend] Using model: ${session.model}`);
      metrics.ai.counter('chat_stream_calls').add(1, { model: session.model });

      if (latestMessage) {
        params = Object.assign({}, params, latestMessage.params, {
          content: latestMessage.content,
          attachments: latestMessage.attachments,
        });
      }

      this.ongoingStreamCount$.next(this.ongoingStreamCount$.value + 1);
      const finalMessage = session.finish(params);
      info.finalMessage = finalMessage.filter(m => m.role !== 'system');

      const source$ = from(
        provider.generateTextStream(finalMessage, session.model, {
          ...session.config.promptConfig,
          promptName: session.config.promptName,
          params,
          webSearch: Boolean(params?.webSearch || params?.googleSearch || (params as any)?.networkSearch || session.config.promptName === 'Search With IntoAI'),
          signal: this.getSignal(req),
          user: userId,
        })
      ).pipe(
        connect(shared$ =>
          merge(
            // actual chat event stream
            shared$.pipe(
              map(data => ({ type: 'message' as const, id: messageId, data }))
            ),
            // save the generated text to the session
            shared$.pipe(
              toArray(),
              concatMap(values => {
                session.push({
                  role: 'assistant',
                  content: values.join(''),
                  createdAt: new Date(),
                });
                return from(session.save());
              }),
              mergeMap(() => EMPTY)
            )
          )
        ),
        catchError(e => {
          metrics.ai.counter('chat_stream_errors').add(1);
          info.throwInStream = true;
          return mapSseError(e, info);
        }),
        finalize(() => {
          this.ongoingStreamCount$.next(this.ongoingStreamCount$.value - 1);
        })
      );

      return this.mergePingStream(messageId, source$);
    } catch (err) {
      metrics.ai.counter('chat_stream_errors').add(1, info);
      return mapSseError(err, info);
    }
  }

  @Public()
  @Sse('/chat/:sessionId/workflow')
  @CallMetric('ai', 'chat_workflow', { timer: true })
  async chatWorkflow(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query() params: Record<string, string>,
    @CurrentUser() user?: CurrentUser
  ): Promise<Observable<ChatEvent>> {
    const info: any = { sessionId, params, throwInStream: false };
    try {
      const { messageId } = this.prepareParams(params);

      const [, session] = await this.appendSessionMessage(sessionId, messageId);
      info.model = session.model;
      const userId = user?.id || session.config.userId;

      metrics.ai.counter('workflow_calls').add(1, { model: session.model });

      const latestMessage = session.stashMessages.findLast(
        m => m.role === 'user'
      );
      if (latestMessage) {
        params = Object.assign({}, params, latestMessage.params, {
          content: latestMessage.content,
          attachments: latestMessage.attachments,
        });
      }
      this.ongoingStreamCount$.next(this.ongoingStreamCount$.value + 1);
      const source$ = from(
        this.workflow.runGraph(params, session.model, {
          ...session.config.promptConfig,
          signal: this.getSignal(req),
          user: userId,
        })
      ).pipe(
        connect(shared$ =>
          merge(
            // actual chat event stream
            shared$.pipe(
              map(data => {
                switch (data.status) {
                  case GraphExecutorState.EmitContent:
                    return {
                      type: 'message' as const,
                      id: messageId,
                      data: data.content,
                    };
                  case GraphExecutorState.EmitAttachment:
                    return {
                      type: 'attachment' as const,
                      id: messageId,
                      data: data.attachment,
                    };
                  default:
                    return {
                      type: 'event' as const,
                      id: messageId,
                      data: {
                        status: data.status,
                        id: data.node.id,
                        type: data.node.config.nodeType,
                      } as any,
                    };
                }
              })
            ),
            // save the generated text to the session
            shared$.pipe(
              toArray(),
              concatMap(values => {
                session.push({
                  role: 'assistant',
                  content: values
                    .filter(v => v.status === GraphExecutorState.EmitContent)
                    .map(v => v.content)
                    .join(''),
                  createdAt: new Date(),
                });
                return from(session.save());
              }),
              mergeMap(() => EMPTY)
            )
          )
        ),
        catchError(e => {
          metrics.ai.counter('workflow_errors').add(1, info);
          info.throwInStream = true;
          return mapSseError(e, info);
        }),
        finalize(() =>
          this.ongoingStreamCount$.next(this.ongoingStreamCount$.value - 1)
        )
      );

      return this.mergePingStream(messageId, source$);
    } catch (err) {
      metrics.ai.counter('workflow_errors').add(1, info);
      return mapSseError(err, info);
    }
  }

  @Public()
  @Sse('/chat/:sessionId/images')
  @CallMetric('ai', 'chat_images', { timer: true })
  async chatImagesStream(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Query() params: Record<string, string>,
    @CurrentUser() user?: CurrentUser
  ): Promise<Observable<ChatEvent>> {
    const info: any = { sessionId, params, throwInStream: false };
    try {
      const { messageId } = this.prepareParams(params);
      const sessionObj = await this.chatSession.get(sessionId);
      if (!sessionObj) {
        throw new CopilotSessionNotFound();
      }
      const userId = user?.id || sessionObj.config.userId;

      const { model, hasAttachment } = await this.checkRequest(
        userId,
        sessionId,
        messageId
      );
      const provider = await this.provider.getProviderByCapability(
        hasAttachment
          ? CopilotCapability.ImageToImage
          : CopilotCapability.TextToImage,
        { model }
      );
      if (!provider) {
        throw new NoCopilotProviderAvailable();
      }

      const [latestMessage, session] = await this.appendSessionMessage(
        sessionId,
        messageId
      );
      info.model = session.model;
      metrics.ai
        .counter('images_stream_calls')
        .add(1, { model: session.model });

      if (latestMessage) {
        params = Object.assign({}, params, latestMessage.params, {
          content: latestMessage.content,
          attachments: latestMessage.attachments,
        });
      }

      const handleRemoteLink = this.storage.handleRemoteLink.bind(
        this.storage,
        userId,
        sessionId
      );
      this.ongoingStreamCount$.next(this.ongoingStreamCount$.value + 1);
      const source$ = from(
        provider.generateImagesStream(session.finish(params), session.model, {
          ...session.config.promptConfig,
          seed: this.parseNumber(params.seed),
          signal: this.getSignal(req),
          user: userId,
        })
      ).pipe(
        mergeMap(handleRemoteLink),
        connect(shared$ =>
          merge(
            // actual chat event stream
            shared$.pipe(
              map(attachment => ({
                type: 'attachment' as const,
                id: messageId,
                data: attachment,
              }))
            ),
            // save the generated text to the session
            shared$.pipe(
              toArray(),
              concatMap(attachments => {
                session.push({
                  role: 'assistant',
                  content: '',
                  attachments: attachments,
                  createdAt: new Date(),
                });
                return from(session.save());
              }),
              mergeMap(() => EMPTY)
            )
          )
        ),
        catchError(e => {
          metrics.ai.counter('images_stream_errors').add(1, info);
          info.throwInStream = true;
          return mapSseError(e, info);
        }),
        finalize(() =>
          this.ongoingStreamCount$.next(this.ongoingStreamCount$.value - 1)
        )
      );

      return this.mergePingStream(messageId, source$);
    } catch (err) {
      metrics.ai.counter('images_stream_errors').add(1, info);
      return mapSseError(err, info);
    }
  }

  @Get('/unsplash/photos')
  @CallMetric('ai', 'unsplash')
  async unsplashPhotos(
    @Req() req: Request,
    @Res() res: Response,
    @Query() params: Record<string, string>
  ) {
    const { key } = this.config.copilot.unsplash;
    if (!key) {
      throw new UnsplashIsNotConfigured();
    }

    const query = new URLSearchParams(params);
    const response = await fetch(
      `https://api.unsplash.com/search/photos?${query}`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: this.getSignal(req),
      }
    );

    res.set({
      'Content-Type': response.headers.get('Content-Type'),
      'Content-Length': response.headers.get('Content-Length'),
      'X-Ratelimit-Limit': response.headers.get('X-Ratelimit-Limit'),
      'X-Ratelimit-Remaining': response.headers.get('X-Ratelimit-Remaining'),
    });

    res.status(response.status).send(await response.json());
  }

  @Public()
  @Get('/blob/:userId/:workspaceId/:key')
  async getBlob(
    @Res() res: Response,
    @Param('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('key') key: string
  ) {
    const { body, metadata, redirectUrl } = await this.storage.get(
      userId,
      workspaceId,
      key,
      true
    );

    if (redirectUrl) {
      // redirect to signed url
      return res.redirect(redirectUrl);
    }

    if (!body) {
      throw new BlobNotFound({
        spaceId: workspaceId,
        blobId: key,
      });
    }

    // metadata should always exists if body is not null
    if (metadata) {
      res.setHeader('content-type', metadata.contentType);
      res.setHeader('last-modified', metadata.lastModified.toUTCString());
      res.setHeader('content-length', metadata.contentLength);
    } else {
      this.logger.warn(`Blob ${workspaceId}/${key} has no metadata`);
    }

    res.setHeader('cache-control', 'public, max-age=2592000, immutable');
    body.pipe(res);
  }
}
