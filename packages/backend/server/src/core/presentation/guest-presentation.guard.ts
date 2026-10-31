import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getRequestResponseFromContext } from '../../base';

@Injectable()
export class GuestPresentationGuard implements CanActivate {
  private readonly logger = new Logger(GuestPresentationGuard.name);

  private readonly ALLOWED_PATH_PATTERNS = [
    /^\/?(?:api\/)?presentation\//i,
    /^\/?(?:api\/)?copilot/i,
    /^\/?(?:api\/)?auth\//i,
    /^\/?(?:api\/)?socket\.io\//i,
    /^\/?(?:api\/)?graphql/i,
    /^\/?(?:api\/)?users?\//i,
    /^\/?(?:api\/)?server-config/i,
    /^\/?(?:api\/)?config/i,
    /^\/?join\//i,
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|html)$/i,
  ];

  // GraphQL operations that presentation guests are allowed to execute
  private readonly ALLOWED_GUEST_OPERATIONS = new Set([
    'createCopilotSession',
    'updateCopilotSession',
    'forkCopilotSession',
    'cleanupCopilotSession',
    'createCopilotMessage',
    'createCopilotContext',
    'getCopilotHistories',
    'getCopilotHistoryIds',
    'getCopilotSessions',
    'listContextObjects',
    'listContext',
    'matchContext',
    'addContextDoc',
    'removeContextDoc',
    'addContextFile',
    'removeContextFile',
    'addContextCategory',
    'removeContextCategory',
    'currentUser',
    'getPublicUserById',
    'publicUserById',
    'getServerConfig',
    'serverConfig',
    'sendProjectShareGuestOtp',
    'verifyProjectShareGuestOtp',
    'getOrCreateProjectShareKey',
    'generateProjectShareKey',
  ]);

  constructor(private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const contextType = context.getType<string>();

    // Allow websocket and rpc
    if (contextType === 'ws' || contextType === 'rpc') {
      return true;
    }

    const { req } = getRequestResponseFromContext(context);
    if (!req) return true;

    const user = (req as any).session?.user || (req as any).user;
    if (!user) return true;

    const isGuest = (user.email as string)?.endsWith('@guest.presentation');
    if (!isGuest) return true;

    // Helper to check if string contains any whitelisted operation
    const isWhitelistedStr = (str?: string): boolean => {
      if (!str || typeof str !== 'string') return false;
      for (const op of this.ALLOWED_GUEST_OPERATIONS) {
        if (str.includes(op)) return true;
      }
      return false;
    };

    const getHeaderStr = (h?: string | string[]): string | undefined => {
      if (typeof h === 'string') return h;
      if (Array.isArray(h)) return h.join(' ');
      return undefined;
    };

    // Unconditionally allow any Project Share Space or whitelisted GraphQL/REST requests
    if (
      isWhitelistedStr(getHeaderStr(req.headers?.['x-operation-name'])) ||
      isWhitelistedStr(getHeaderStr(req.headers?.['x-graphql-operation'])) ||
      isWhitelistedStr(req.url) ||
      isWhitelistedStr(req.originalUrl) ||
      isWhitelistedStr(req.path) ||
      req.headers?.['x-share-key'] ||
      req.headers?.['x-project-share-key'] ||
      req.query?.shareKey ||
      req.query?.share_key
    ) {
      return true;
    }

    if (req.body) {
      if (typeof req.body === 'string' && isWhitelistedStr(req.body)) {
        return true;
      }
      if (typeof req.body === 'object') {
        try {
          if (isWhitelistedStr(JSON.stringify(req.body))) {
            return true;
          }
        } catch (_) {}
      }
    }

    // Helper to extract GraphQL operation name from any payload structure or query string
    const getOpName = (bodyObj?: any): string | undefined => {
      if (!bodyObj) return undefined;
      if (typeof bodyObj.operationName === 'string' && bodyObj.operationName) return bodyObj.operationName;
      if (typeof bodyObj.op === 'string' && bodyObj.op) return bodyObj.op;
      if (typeof bodyObj.name === 'string' && bodyObj.name) return bodyObj.name;
      if (typeof bodyObj.id === 'string' && bodyObj.id) {
        const cleaned = bodyObj.id.replace(/(?:Mutation|Query)$/i, '');
        if (cleaned) return cleaned;
      }
      const headerOp = req.headers?.['x-operation-name'];
      if (typeof headerOp === 'string' && headerOp.length > 0) return headerOp;
      if (typeof bodyObj.query === 'string' && bodyObj.query) {
        const match = bodyObj.query.match(/(?:query|mutation)\s+([A-Za-z0-9_]+)/i);
        if (match && match[1]) return match[1];
      }
      return undefined;
    };

    // For GraphQL context type, check operation name directly
    if (contextType === 'graphql') {
      try {
        const { GqlExecutionContext } = await import('@nestjs/graphql');
        const gqlCtx = GqlExecutionContext.create(context);
        const info = gqlCtx.getInfo();
        if (info) {
          const fieldName = info.fieldName;
          const opName = info.operation?.name?.value;
          if (fieldName && (this.ALLOWED_GUEST_OPERATIONS.has(fieldName) || isWhitelistedStr(fieldName))) return true;
          if (opName && (this.ALLOWED_GUEST_OPERATIONS.has(opName) || isWhitelistedStr(opName))) return true;
        }
      } catch (_) {
        // If we can't parse GraphQL info, fall through to path-based checks
      }
    }

    let path: string = req.path || req.url || '';
    if (path.includes('://')) {
      try {
        path = new URL(path).pathname;
      } catch (_) {
        const match = path.match(/^https?:\/\/[^/]+(\/[^?#]*)/);
        if (match) {
          path = match[1];
        }
      }
    } else {
      path = path.split('?')[0];
    }

    const isAllowed = this.ALLOWED_PATH_PATTERNS.some(p => p.test(path));
    const isGraphQL = path.match(/^\/?(?:api\/)?graphql/i);

    // Unconditionally allow whitelisted GraphQL operations
    if (isGraphQL) {
      const body = req.body;
      let isWhitelisted = false;

      if (Array.isArray(body)) {
        isWhitelisted = body.length > 0 && body.every(reqObj => {
          const op = getOpName(reqObj);
          return op && this.ALLOWED_GUEST_OPERATIONS.has(op);
        });
      } else if (body && typeof body === 'object') {
        const op = getOpName(body);
        if (op && this.ALLOWED_GUEST_OPERATIONS.has(op)) {
          isWhitelisted = true;
        }
      }

      if (isWhitelisted) {
        return true;
      }
    }

    if (isAllowed && !isGraphQL) {
      return true;
    }

    // Retrieve the active presentation guest session for this guest
    const guestSession = await this.prisma.presentationGuestSession.findFirst({
      where: {
        userId: user.id,
        room: {
          status: 'active',
        },
      },
      include: {
        room: true,
      },
    });

    // Secure GraphQL variables for non-whitelisted operations
    if (isGraphQL) {
      const body = req.body;
      const checkVariables = (vars: any, operationName?: string) => {
        const opName = getOpName({ operationName, ...vars });
        if (opName && this.ALLOWED_GUEST_OPERATIONS.has(opName)) {
          return;
        }

        if (vars) {
          const isUserQuery =
            operationName === 'getPublicUserById' ||
            operationName === 'publicUserById' ||
            operationName?.toLowerCase().includes('user');
          // Check both top-level and nested (inside 'options') workspaceId
          const workspaceId =
            vars.workspaceId ||
            vars.options?.workspaceId ||
            (!isUserQuery ? vars.id : undefined) ||
            vars.ws;
          if (typeof workspaceId === 'string' && workspaceId.length > 0) {
            if (!guestSession) {
              throw new ForbiddenException(
                'No active presentation session found'
              );
            }
            // Avoid blocking if it's a doc ID (temp-roomId) or user ID (user.id)
            if (
              workspaceId !== guestSession.room.workspaceId &&
              workspaceId !== `temp-${guestSession.roomId}` &&
              workspaceId !== user.id
            ) {
              throw new ForbiddenException(
                'Presentation guests cannot access this workspace'
              );
            }
          }
        }
      };

      if (Array.isArray(body)) {
        for (const reqObj of body) {
          checkVariables(reqObj?.variables, reqObj?.operationName);
        }
      } else if (body && typeof body === 'object') {
        checkVariables(body.variables, body.operationName);
      }
      return true;
    }

    if (!guestSession) {
      throw new ForbiddenException('No active presentation session found');
    }

    // Enforce REST level restrictions strictly scoped to guest's room.workspaceId
    const docMatch = path.match(/\/(?:api\/)?workspaces?\/([^/]+)\/docs\/([^/]+)/i);
    if (docMatch) {
      const workspaceId = docMatch[1];
      const docId = docMatch[2];
      if (
        workspaceId === guestSession.room.workspaceId &&
        (docId === `temp-${guestSession.roomId}` || docId === workspaceId || docId === guestSession.room.docId)
      ) {
        return true;
      }
      throw new ForbiddenException(
        'Presentation guests cannot access this document'
      );
    }

    const blobMatch = path.match(/\/(?:api\/)?workspaces?\/([^/]+)\/blobs\/([^/]+)/i);
    if (blobMatch) {
      const workspaceId = blobMatch[1];
      if (workspaceId === guestSession.room.workspaceId) {
        return true;
      }
      throw new ForbiddenException(
        'Presentation guests cannot access this blob'
      );
    }

    const workspaceMatch = path.match(/\/(?:api\/)?workspaces?\/([^/]+)/i);
    if (workspaceMatch) {
      const workspaceId = workspaceMatch[1];
      if (workspaceId === guestSession.room.workspaceId) {
        return true;
      }
      throw new ForbiddenException(
        'Presentation guests cannot access this workspace'
      );
    }

    this.logger.warn(
      `[GuestPresentationGuard] Catch-all DENY for guest ${user.id}, path="${path}", contextType="${contextType}"`
    );
    throw new ForbiddenException(
      'Presentation guests cannot access this resource'
    );
  }
}
