import { notify } from '@affine/component';
import { UserFriendlyError } from '@affine/error';
import type { PropsWithChildren, ReactNode } from 'react';
import { useCallback } from 'react';
import type { SWRConfiguration } from 'swr';
import { SWRConfig } from 'swr';

const swrConfig: SWRConfiguration = {
  suspense: true,
  use: [
    useSWRNext => (key, fetcher, config) => {
      const fetcherWrapper = useCallback(
        async (...args: any[]) => {
          if (!fetcher) {
            throw new Error('fetcher is not found');
          }
          const d = fetcher(...args);
          if (d instanceof Promise) {
            return d.catch(e => {
              const error = UserFriendlyError.fromAny(e);
              const errName = String(error?.name || error?.code || '').toUpperCase();
              const errMsg = String(error?.message || '').toLowerCase();
              const isAuthError = errName.includes('AUTHENTICATION') || errName.includes('UNAUTHORIZED') || errName.includes('ACCESSDENIED') || errMsg.includes('authentication') || errMsg.includes('unauthorized') || errMsg.includes('access denied');

              const isGuestMode = typeof window !== 'undefined' && (
                !!localStorage.getItem('affine-project-share-key') ||
                window.location.search.includes('shareKey') ||
                window.location.search.includes('share_key')
              );

              // Do not display redundant toasts for handled document copy actions or guest auth issues
              const isHandledDocAction = errMsg.includes('previous release') || errMsg.includes('no document') || errMsg.includes('copy');

              if ((!isAuthError || !isGuestMode) && !isHandledDocAction) {
                notify.error({
                  title: error.name,
                  message: error.message,
                });
              }

              throw e;
            });
          }
          return d;
        },
        [fetcher]
      );
      return useSWRNext(key, fetcher ? fetcherWrapper : fetcher, config);
    },
  ],
};

export const SWRConfigProvider = (props: PropsWithChildren): ReactNode => {
  return <SWRConfig value={swrConfig}>{props.children}</SWRConfig>;
};
