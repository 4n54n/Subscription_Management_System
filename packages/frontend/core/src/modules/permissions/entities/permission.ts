import {
  backoffRetry,
  effect,
  Entity,
  exhaustMapWithTrailing,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { EMPTY, mergeMap } from 'rxjs';

import type { WorkspaceService } from '../../workspace';
import type { WorkspacePermissionStore } from '../stores/permission';

export class WorkspacePermission extends Entity {
  private readonly cache$ = LiveData.from(
    this.store.watchWorkspacePermissionCache(),
    undefined
  );
  isOwner$ = this.cache$.map(cache => cache?.isOwner ?? null);
  isAdmin$ = this.cache$.map(cache => cache?.isAdmin ?? null);
  isTeam$ = this.cache$.map(cache => cache?.isTeam ?? null);
  isRevalidating$ = new LiveData(false);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly store: WorkspacePermissionStore
  ) {
    super();
  }

  revalidate = effect(
    exhaustMapWithTrailing(() => {
      return fromPromise(async signal => {
        const isShareUrl = typeof window !== 'undefined' && (
          window.location.search.includes('shareKey=') ||
          window.location.search.includes('share=') ||
          window.location.search.includes('share_key=')
        );
        if (this.workspaceService.workspace.flavour !== 'local') {
          try {
            const info = await this.store.fetchWorkspaceInfo(
              this.workspaceService.workspace.id,
              signal
            );

            return {
              isOwner: info.isOwner,
              isAdmin: info.isAdmin,
              isTeam: info.workspace.team,
            };
          } catch (e) {
            if (isShareUrl) {
              return { isOwner: false, isAdmin: false, isTeam: false };
            }
            throw e;
          }
        } else {
          return { isOwner: true, isAdmin: false, isTeam: false };
        }
      }).pipe(
        backoffRetry({
          count: Infinity,
        }),
        mergeMap(({ isOwner, isAdmin, isTeam }) => {
          this.store.setWorkspacePermissionCache({
            isOwner,
            isAdmin,
            isTeam,
          });
          return EMPTY;
        }),
        onStart(() => this.isRevalidating$.setValue(true)),
        onComplete(() => this.isRevalidating$.setValue(false))
      );
    })
  );

  async waitForRevalidation(signal?: AbortSignal) {
    this.revalidate();
    await this.isRevalidating$.waitFor(
      isRevalidating => !isRevalidating,
      signal
    );
  }

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}
