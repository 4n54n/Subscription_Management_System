import { notify } from '@affine/component';
import { AffineOtherPageLayout } from '@affine/component/affine-other-page-layout';
import { SignInPageContainer } from '@affine/component/auth-components';
import { SignInPanel } from '@affine/core/components/sign-in';
import { SignInBackgroundArts } from '@affine/core/components/sign-in/background-arts';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { useI18n } from '@affine/i18n';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../components/hooks/use-navigate-helper';

import { AuthService } from '../../../modules/cloud';
import { useLiveData, useService } from '@toeverything/infra';

let lastShownError: string | null = null;

export const SignIn = ({
  redirectUrl: redirectUrlFromProps,
}: {
  redirectUrl?: string;
}) => {
  const t = useI18n();
  const navigate = useNavigate();
  const { jumpToIndex } = useNavigateHelper();
  const [searchParams, setSearchParams] = useSearchParams();
  const redirectUrl = redirectUrlFromProps ?? searchParams.get('redirect_uri');

  const authService = useService(AuthService);
  const loginStatus = useLiveData(authService.session.status$);

  // Track whether we've done a fresh server-side session check.
  // Prevents redirecting based on stale cached auth state (e.g. expired
  // Cloudflare Access cookie) which would cause an infinite redirect loop.
  const [isSessionVerified, setIsSessionVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authService.session.waitForRevalidation().then(() => {
      if (!cancelled) setIsSessionVerified(true);
    });
    return () => {
      cancelled = true;
    };
  }, [authService.session]);

  const server = searchParams.get('server') ?? undefined;
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      if (error !== lastShownError) {
        lastShownError = error;
        notify.error({
          title: t['com.IntoAI.auth.toast.title.failed'](),
          message: error,
        });
        setSearchParams(
          prev => {
            const next = new URLSearchParams(prev);
            next.delete('error');
            return next;
          },
          { replace: true }
        );
      }
    } else {
      lastShownError = null;
    }
  }, [error, setSearchParams, t]);

  const handleClose = useCallback(() => {
    jumpToIndex(RouteLogic.REPLACE, {
      search: searchParams.toString(),
    });
  }, [jumpToIndex, searchParams]);

  const handleAuthenticated = useCallback(
    (status: AuthSessionStatus) => {
      if (status === 'authenticated') {
        if (redirectUrl) {
          if (redirectUrl.toUpperCase() === 'CLOSE_POPUP') {
            window.close();
            return;
          }
          if (/^https?:\/\//i.test(redirectUrl)) {
            window.location.href = redirectUrl;
          } else if (
            redirectUrl.startsWith('/sign-in') ||
            redirectUrl.startsWith('/signIn')
          ) {
            jumpToIndex(RouteLogic.REPLACE);
          } else {
            navigate(redirectUrl, {
              replace: true,
            });
          }
        } else {
          handleClose();
        }
      }
    },
    [handleClose, jumpToIndex, navigate, redirectUrl]
  );

  useEffect(() => {
    // Only redirect if the session has been freshly verified by the server.
    // Throttle redirects to prevent ping-pong loops between /sign-in and AuthGuard on protected routes.
    if (isSessionVerified && loginStatus === 'authenticated') {
      const lastRedirectStr = sessionStorage.getItem('last_sign_in_redirect');
      const now = Date.now();
      if (lastRedirectStr) {
        const lastRedirect = parseInt(lastRedirectStr, 10);
        if (now - lastRedirect < 3000) {
          // Bounced back to /sign-in within 3 seconds -> stop redirect loop
          return;
        }
      }
      sessionStorage.setItem('last_sign_in_redirect', String(now));
      handleAuthenticated('authenticated');
    }
  }, [loginStatus, isSessionVerified, handleAuthenticated]);

  const initStep = server ? 'addSelfhosted' : 'signIn';

  return (
    <div style={{ width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      <SignInPanel
        onAuthenticated={handleAuthenticated}
        initStep={initStep}
        server={server}
      />
    </div>
  );
};

export const Component = () => {
  return <SignIn />;
};
