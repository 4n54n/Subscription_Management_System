import {
  type GetDocRolePermissionsQuery,
  getDocRolePermissionsQuery,
  type GetWorkspaceRolePermissionsQuery,
  getWorkspaceRolePermissionsQuery,
} from '@affine/graphql';
import { Store } from '@toeverything/infra';

import { AuthService, type WorkspaceServerService } from '../../cloud';
import type { WorkspaceService } from '../../workspace';

export type WorkspacePermissionActions = keyof Omit<
  GetWorkspaceRolePermissionsQuery['workspaceRolePermissions']['permissions'],
  '__typename'
>;

export type DocPermissionActions = keyof Omit<
  GetDocRolePermissionsQuery['workspace']['doc']['permissions'],
  '__typename'
>;

export class GuardStore extends Store {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceServerService: WorkspaceServerService
  ) {
    super();
  }

  async getWorkspacePermissions(): Promise<
    Record<WorkspacePermissionActions, boolean>
  > {
    const isShareUrl = typeof window !== 'undefined' && (
      window.location.search.includes('shareKey=') ||
      window.location.search.includes('share=') ||
      window.location.search.includes('share_key=')
    );
    const authService = this.workspaceServerService.server?.scope.get(AuthService);
    const isAuth = authService?.session.status$.value === 'authenticated';
    if (!isAuth && isShareUrl) {
      return {
        Workspace_Blobs_Read: true,
      } as any;
    }
    if (!this.workspaceServerService.server) {
      throw new Error('No server');
    }
    try {
      const data = await this.workspaceServerService.server.gql({
        query: getWorkspaceRolePermissionsQuery,
        variables: {
          id: this.workspaceService.workspace.id,
        },
      });
      return data.workspaceRolePermissions.permissions;
    } catch (e) {
      if (isShareUrl || !isAuth) {
        return {
          Workspace_Blobs_Read: true,
        } as any;
      }
      throw e;
    }
  }

  async getDocPermissions(
    docId: string
  ): Promise<Record<DocPermissionActions, boolean>> {
    const isShareUrl = typeof window !== 'undefined' && (
      window.location.search.includes('shareKey=') ||
      window.location.search.includes('share=') ||
      window.location.search.includes('share_key=')
    );
    const authService = this.workspaceServerService.server?.scope.get(AuthService);
    const isAuth = authService?.session.status$.value === 'authenticated';
    if (!isAuth && isShareUrl) {
      return {
        Doc_Read: true,
        Doc_Properties_Read: true,
      } as any;
    }
    if (!this.workspaceServerService.server) {
      throw new Error('No server');
    }
    try {
      const data = await this.workspaceServerService.server.gql({
        query: getDocRolePermissionsQuery,
        variables: {
          workspaceId: this.workspaceService.workspace.id,
          docId,
        },
      });
      return data.workspace.doc.permissions;
    } catch (e) {
      if (isShareUrl || !isAuth) {
        return {
          Doc_Read: true,
          Doc_Properties_Read: true,
        } as any;
      }
      throw e;
    }
  }
}
