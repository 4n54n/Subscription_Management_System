import type {
  CanActivate,
  ExecutionContext,
  FactoryProvider,
  OnModuleInit,
} from '@nestjs/common';
import { Injectable, SetMetadata } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Socket } from 'socket.io';

import {
  AccessDenied,
  AuthenticationRequired,
  Config,
  CryptoHelper,
  getRequestResponseFromContext,
  parseCookies,
} from '../../base';
import { WEBSOCKET_OPTIONS } from '../../base/websocket';
import { AuthService } from './service';
import { Session } from './session';

import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { GqlExecutionContext } from '@nestjs/graphql';

const PUBLIC_ENTRYPOINT_SYMBOL = Symbol('public');
const INTERNAL_ENTRYPOINT_SYMBOL = Symbol('internal');

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private auth!: AuthService;

  constructor(
    private readonly crypto: CryptoHelper,
    private readonly ref: ModuleRef,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaClient
  ) {}

  onModuleInit() {
    this.auth = this.ref.get(AuthService, { strict: false });
  }

  private async validateShareAccess(shareKey: string, sharePassword?: string): Promise<boolean> {
    if (!shareKey || !sharePassword) {
      return false;
    }

    // 1. Whitelist validation of characters
    if (!/^[A-Za-z0-9]+$/.test(sharePassword)) {
      return false;
    }
    if (!/^[A-Za-z0-9+/=,:\-]+$/.test(shareKey)) {
      return false;
    }

    try {
      // 2. Verify signature
      const isValidSignature = this.crypto.verify(shareKey);
      if (!isValidSignature) {
        return false;
      }

      // 3. Parse payload: workspaceId:projectId:passwordHash:createdAt
      const [data] = shareKey.split(',');
      const parts = data.split(':');
      const workspaceId = parts[0];
      const projectId = parts[1] || null;
      const passwordHash = parts[2];
      const createdAtStr = parts[3];

      if (!workspaceId || !passwordHash || !createdAtStr) {
        return false;
      }

      // Check 30-day rotation expiry
      const createdAt = parseInt(createdAtStr, 10);
      if (isNaN(createdAt) || Date.now() - createdAt > 30 * 24 * 60 * 60 * 1000) {
        return false;
      }

      // 4. Check database match
      if (projectId) {
        const project = await this.prisma.project.findFirst({
          where: { id: projectId, workspaceId },
        });
        if (!project) {
          return false;
        }
        if (project.shareKey !== shareKey) {
          return false;
        }
      } else {
        const workspace = await this.prisma.workspace.findFirst({
          where: { id: workspaceId },
        });
        if (!workspace) {
          return false;
        }
        if (workspace.shareKey !== shareKey) {
          return false;
        }
      }

      // 5. Verify password hash matches
      const hasher = createHash('sha256');
      hasher.update(sharePassword + workspaceId + (projectId || ''));
      const computedHash = hasher.digest('hex');

      if (computedHash !== passwordHash) {
        return false;
      }

      return true;
    } catch (e) {
      console.error('[AuthGuard] Share validation failed:', e);
      return false;
    }
  }

  async canActivate(context: ExecutionContext) {
    const { req, res } = getRequestResponseFromContext(context);
    const clazz = context.getClass();
    const handler = context.getHandler();

    // Try to sign in the user from session cookies first
    const existingSession = await this.signIn(req, res);
    if (existingSession?.user?.id) {
      // User is already authenticated (e.g., presentation guest with session cookie)
      // Skip share key checks entirely - they have a real session
      if (res && existingSession.expiresAt) {
        await this.auth.refreshUserSessionIfNeeded(res, existingSession);
      }
      return true;
    }

    // Check guest share key authentication (only for users without a session)
    const shareKey = req.headers?.['x-share-key'] || req.get?.('x-share-key');
    const sharePassword = req.headers?.['x-share-password'] || req.get?.('x-share-password');

    if (typeof shareKey === 'string' && shareKey) {
      const targetPassword = (typeof sharePassword === 'string' && sharePassword) ? sharePassword : 'permanentGuestPass123';
      const isShareValid = await this.validateShareAccess(shareKey, targetPassword);
      if (isShareValid) {
        req.session = {
          user: {
            id: 'share-guest',
            name: 'Guest Viewer',
            email: 'guest@share.local',
          },
        } as any;

        // Block write operations for share guests except whitelisted guest mutations
        if (context.getType<string>() === 'graphql') {
          const ctx = GqlExecutionContext.create(context);
          const info = ctx.getInfo();
          if (info?.operation?.operation === 'mutation') {
            const fieldName = info.fieldName;
            if (
              fieldName !== 'sendProjectShareGuestOtp' &&
              fieldName !== 'verifyProjectShareGuestOtp' &&
              fieldName !== 'clientApproveDocument' &&
              fieldName !== 'sendClientSignatureOtp' &&
              fieldName !== 'clientSignDocument'
            ) {
              throw new AccessDenied('Guest user is read-only');
            }
          }
        } else {
          if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
            throw new AccessDenied('Guest user is read-only');
          }
        }

        return true;
      }
    }

    // rpc request is internal
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_ENTRYPOINT_SYMBOL,
      [clazz, handler]
    );
    if (isInternal) {
      // check access token: data,signature
      const accessToken = req.get('x-access-token');
      if (accessToken && this.crypto.verify(accessToken)) {
        return true;
      }
      throw new AccessDenied('Invalid internal request');
    }

    const userSession = await this.signIn(req, res);
    if (res && userSession && userSession.expiresAt) {
      await this.auth.refreshUserSessionIfNeeded(res, userSession);
    }

    // api is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ENTRYPOINT_SYMBOL,
      [clazz, handler]
    );

    if (isPublic) {
      return true;
    }

    if (!userSession) {
      throw new AuthenticationRequired();
    }

    return true;
  }

  async signIn(req: Request, res?: Response): Promise<Session | null> {
    if (req.session) {
      return req.session;
    }

    // TODO(@forehalo): a cache for user session
    const userSession = await this.auth.getUserSessionFromRequest(req, res);

    if (userSession) {
      req.session = {
        ...userSession.session,
        user: userSession.user,
      };

      return req.session;
    }

    return null;
  }
}

/**
 * Mark api to be public accessible
 */
export const Public = () => SetMetadata(PUBLIC_ENTRYPOINT_SYMBOL, true);

/**
 * Mark rpc api to be internal accessible
 */
export const Internal = () => SetMetadata(INTERNAL_ENTRYPOINT_SYMBOL, true);

export const AuthWebsocketOptionsProvider: FactoryProvider = {
  provide: WEBSOCKET_OPTIONS,
  useFactory: (config: Config, guard: AuthGuard) => {
    return {
      ...config.websocket,
      canActivate: async (socket: Socket) => {
        const upgradeReq = socket.client.request as Request;
        const handshake = socket.handshake;

        // compatibility with websocket request
        parseCookies(upgradeReq);

        upgradeReq.cookies = {
          [AuthService.sessionCookieName]: handshake.auth.token,
          [AuthService.userCookieName]: handshake.auth.userId,
          ...upgradeReq.cookies,
        };

        const session = await guard.signIn(upgradeReq);

        return !!session;
      },
    };
  },
  inject: [Config, AuthGuard],
};
