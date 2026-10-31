import { DebugLogger } from '@affine/debug';
import { UserFriendlyError } from '@affine/error';
import { fromPromise, Service } from '@toeverything/infra';

import type { ServerService } from './server';

const logger = new DebugLogger('affine:fetch');

export type FetchInit = RequestInit & { timeout?: number };

export class FetchService extends Service {
  constructor(private readonly serverService: ServerService) {
    super();
  }
  rxFetch = (
    input: string,
    init?: RequestInit & {
      // https://github.com/microsoft/TypeScript/issues/54472
      priority?: 'auto' | 'low' | 'high';
    } & {
      traceEvent?: string;
    }
  ) => {
    return fromPromise(signal => {
      return this.fetch(input, { signal, ...init });
    });
  };

  /**
   * fetch with custom custom timeout and error handling.
   */
  fetch = async (input: string, init?: FetchInit): Promise<Response> => {
    logger.debug('fetch', input);
    const externalSignal = init?.signal;
    if (externalSignal?.aborted) {
      throw externalSignal.reason;
    }
    const abortController = new AbortController();
    externalSignal?.addEventListener('abort', reason => {
      abortController.abort(reason);
    });

    const timeout = init?.timeout ?? 15000;
    const timeoutId = setTimeout(() => {
      abortController.abort('timeout');
    }, timeout);

    let res: Response;

    const urlShareKey = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('shareKey') || new URLSearchParams(window.location.search).get('share_key')) : null;
    const shareKey = (typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-key') : null) || urlShareKey;
    const sharePassword = (typeof window !== 'undefined' ? localStorage.getItem('affine-project-share-password') : null) || 'permanentGuestPass123';
    const shareHeaders: Record<string, string> = {};
    if (shareKey) shareHeaders['x-share-key'] = shareKey;
    if (sharePassword) shareHeaders['x-share-password'] = sharePassword;

    try {
      res = await globalThis.fetch(
        new URL(input, this.serverService.server.serverMetadata.baseUrl),
        {
          ...init,
          signal: abortController.signal,
          headers: {
            ...shareHeaders,
            ...init?.headers,
            'x-affine-version': BUILD_CONFIG.appVersion,
          },
        }
      );
    } catch (err: any) {
      throw new UserFriendlyError({
        status: 504,
        code: 'NETWORK_ERROR',
        type: 'NETWORK_ERROR',
        name: 'NETWORK_ERROR',
        message: `Network error: ${err.message}`,
        stacktrace: err.stack,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      if (res.status === 504) {
        const error = new Error('Gateway Timeout');
        logger.debug('network error', error);
        throw new UserFriendlyError({
          status: 504,
          code: 'NETWORK_ERROR',
          type: 'NETWORK_ERROR',
          name: 'NETWORK_ERROR',
          message: 'Gateway Timeout',
          stacktrace: error.stack,
        });
      } else {
        let rawErrorData: any;
        if (res.headers.get('Content-Type')?.startsWith('application/json')) {
          try {
            rawErrorData = await res.json();
          } catch {
            rawErrorData = await res.text();
          }
        } else {
          rawErrorData = await res.text();
        }
        const err = UserFriendlyError.fromAny(rawErrorData);
        if (err.status === 500 && res.status !== 500) {
          throw new UserFriendlyError({
            status: res.status,
            code: err.code,
            type: err.type,
            name:
              res.status === 401
                ? 'UNAUTHENTICATED'
                : res.status === 403
                  ? 'FORBIDDEN'
                  : err.name,
            message: err.message || res.statusText,
          });
        }
        throw err;
      }
    }

    return res;
  };
}
