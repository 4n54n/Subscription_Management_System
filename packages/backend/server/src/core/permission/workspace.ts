import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { SpaceAccessDenied } from '../../base';
import { Models } from '../../models';
import { AccessController } from './controller';
import type { Resource } from './resource';
import {
  mapWorkspaceRoleToPermissions,
  WorkspaceAction,
  workspaceActionRequiredRole,
  WorkspaceRole,
} from './types';

@Injectable()
export class WorkspaceAccessController extends AccessController<'ws'> {
  protected readonly type = 'ws';

  constructor(
    private readonly models: Models,
    private readonly prisma: PrismaClient
  ) {
    super();
  }

  async role(resource: Resource<'ws'>) {
    let role = await this.getRole(resource);

    // NOTE(@forehalo): special case for public page
    // Currently, we can not only load binary of a public Doc to render in a shared page,
    // so we need to ensure anyone has basic 'read' permission to a workspace that has public pages.
    if (!role && (await this.models.doc.hasPublic(resource.workspaceId))) {
      role = WorkspaceRole.External;
    }

    return {
      role,
      permissions: mapWorkspaceRoleToPermissions(role),
    };
  }

  async can(resource: Resource<'ws'>, action: WorkspaceAction) {
    const { permissions, role } = await this.role(resource);
    const allow = permissions[action] || false;

    if (!allow) {
      this.logger.log('Workspace access check failed', {
        action,
        resource,
        role,
        requiredRole: workspaceActionRequiredRole(action),
      });
    }

    return allow;
  }

  async assert(resource: Resource<'ws'>, action: WorkspaceAction) {
    const allow = await this.can(resource, action);

    if (!allow) {
      throw new SpaceAccessDenied({ spaceId: resource.workspaceId });
    }
  }

  async getRole(payload: Resource<'ws'>) {
    if (!payload.userId) {
      return null;
    }

    if (payload.userId === 'share-guest') {
      return WorkspaceRole.External;
    }

    // Check if user is a guest in an active presentation room in this workspace
    const guestSession = await this.prisma.presentationGuestSession.findFirst({
      where: {
        userId: payload.userId,
        room: {
          workspaceId: payload.workspaceId,
          status: 'active',
        },
      },
    });

    if (guestSession) {
      return WorkspaceRole.Collaborator;
    }

    const userRole = await this.models.workspaceUser.getActive(
      payload.workspaceId,
      payload.userId
    );

    let role = userRole?.type as WorkspaceRole | null;

    if (!role) {
      role = await this.defaultWorkspaceRole(payload);
    }

    return role;
  }

  private async defaultWorkspaceRole(payload: Resource<'ws'>) {
    const ws = await this.models.workspace.get(payload.workspaceId);

    // NOTE(@forehalo):
    //   we allow user to use online service with local workspace
    //   so we always return owner role for local workspace
    //   copilot session for local workspace is an example
    if (!ws) {
      if (payload.allowLocal) {
        return WorkspaceRole.Owner;
      }

      return null;
    }

    if (ws.public) {
      return WorkspaceRole.External;
    }

    return null;
  }
}
