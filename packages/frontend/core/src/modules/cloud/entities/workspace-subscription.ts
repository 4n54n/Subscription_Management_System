import type { SubscriptionQuery, SubscriptionRecurring } from '@affine/graphql';
import { SubscriptionPlan } from '@affine/graphql';
import {
  catchErrorInto,
  effect,
  Entity,
  exhaustMapWithTrailing,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  smartRetry,
} from '@toeverything/infra';
import { EMPTY, mergeMap } from 'rxjs';

import type { WorkspaceService } from '../../workspace';
import type { WorkspaceServerService } from '../services/workspace-server';
import { SubscriptionStore } from '../stores/subscription';
export type SubscriptionType = NonNullable<
  SubscriptionQuery['currentUser']
>['subscriptions'][number];

export class WorkspaceSubscription extends Entity {
  subscription$ = new LiveData<SubscriptionType | null | undefined>(null);
  isRevalidating$ = new LiveData(false);
  error$ = new LiveData<any | null>(null);

  team$ = this.subscription$.map(
    subscription => subscription?.plan === SubscriptionPlan.Team
  );

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceServerService: WorkspaceServerService
  ) {
    super();
  }
  server = this.workspaceServerService.server;
  store = this.workspaceServerService.server?.scope.get(SubscriptionStore);

  async resumeSubscription(idempotencyKey: string, plan?: SubscriptionPlan) {
    if (!this.store) {
      throw new Error('Subscription store not available');
    }
    await this.store.mutateResumeSubscription(
      idempotencyKey,
      plan,
      undefined,
      this.workspaceService.workspace.id
    );
    await this.waitForRevalidation();
  }

  async cancelSubscription(idempotencyKey: string, plan?: SubscriptionPlan) {
    if (!this.store) {
      throw new Error('Subscription store not available');
    }
    await this.store.mutateCancelSubscription(
      idempotencyKey,
      plan,
      undefined,
      this.workspaceService.workspace.id
    );
    await this.waitForRevalidation();
  }

  async setSubscriptionRecurring(
    idempotencyKey: string,
    recurring: SubscriptionRecurring,
    plan?: SubscriptionPlan
  ) {
    if (!this.store) {
      throw new Error('Subscription store not available');
    }
    await this.store.setSubscriptionRecurring(
      idempotencyKey,
      recurring,
      plan,
      this.workspaceService.workspace.id
    );
    await this.waitForRevalidation();
  }

  async waitForRevalidation(signal?: AbortSignal) {
    this.revalidate();
    await this.isRevalidating$.waitFor(
      isRevalidating => !isRevalidating,
      signal
    );
  }

  revalidate = effect(
    exhaustMapWithTrailing(() => {
      return fromPromise(async signal => {
        const currentWorkspaceId = this.workspaceService.workspace.id;
        if (!currentWorkspaceId || !this.server) {
          return undefined; // no subscription if no user
        }

        const serverConfig = await this.server.features$.waitForNonNull(signal);

        if (!serverConfig.payment) {
          // No payment feature, mock active Team subscription for self-hosted/custom servers
          return {
            workspaceId: currentWorkspaceId,
            subscription: {
              id: 'mock-team',
              plan: SubscriptionPlan.Team,
              status: 'active' as any,
              recurring: 'Lifetime' as any,
              variant: 'Onetime' as any,
              start: new Date(0).toISOString(),
              end: new Date(2999, 11, 31).toISOString(),
              nextBillAt: null,
              canceledAt: null,
              updatedAt: new Date(0).toISOString(),
              createdAt: new Date(0).toISOString(),
            } as SubscriptionType,
          };
        }
        if (!this.store) {
          return {
            workspaceId: currentWorkspaceId,
            subscription: null,
          };
        }
        const { workspaceId, subscription } =
          await this.store.fetchWorkspaceSubscriptions(
            currentWorkspaceId,
            signal
          );
        return {
          workspaceId: workspaceId,
          subscription: subscription,
        };
      }).pipe(
        smartRetry(),
        mergeMap(data => {
          if (data && data.subscription && data.workspaceId && this.store) {
            this.store.setCachedWorkspaceSubscription(
              data.workspaceId,
              data.subscription
            );
            this.subscription$.next(data.subscription);
          } else {
            this.subscription$.next(undefined);
          }
          return EMPTY;
        }),
        catchErrorInto(this.error$),
        onStart(() => this.isRevalidating$.next(true)),
        onComplete(() => this.isRevalidating$.next(false))
      );
    })
  );

  reset() {
    this.subscription$.next(null);
    this.team$.next(false);
    this.isRevalidating$.next(false);
    this.error$.next(null);
  }

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}
