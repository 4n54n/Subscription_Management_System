import { NotificationCenter } from '@affine/component';
import { DefaultServerService, AuthService } from '@affine/core/modules/cloud';
import { FrameworkScope, useService, useLiveData } from '@toeverything/infra';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { GlobalDialogs } from '../../dialogs';
import { AppFallback } from '../../components/app-fallback';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const authService = useService(AuthService);
  const status = useLiveData(authService.session.status$);
  const account = useLiveData(authService.session.account$);
  const navigate = useNavigate();
  const location = useLocation();
  const lastRedirectRef = useRef<number>(0);

  const authRoutes = [
    '/sign-in',
    '/signIn',
    '/desktop-signin',
    '/magic-link',
    '/oauth/login',
    '/oauth/callback',
    '/join',
  ];

  const isAuthRoute =
    authRoutes.some(
      route => location.pathname.startsWith(route) || location.pathname.startsWith('/auth/')
    ) || /\/workspace\/[^/]+\/present\/[^/]+/.test(location.pathname);

  useEffect(() => {
    if (status === 'unauthenticated' && !isAuthRoute) {
      const now = Date.now();
      if (now - lastRedirectRef.current < 2000) {
        return;
      }
      lastRedirectRef.current = now;
      navigate(`/sign-in?redirect_uri=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      return;
    }

    // ── Guest presentation users → lock to their room only ───────────────
    const isGuest = account?.email?.endsWith('@guest.presentation') ?? false;
    if (isGuest && status === 'authenticated') {
      const guestRoomPath = sessionStorage.getItem('presentation_room_path');

      // If they are on a join/whitelisted route, do not force redirect yet
      if (isAuthRoute) {
        return;
      }

      // If we have a stored room path and the current path isn't that room → redirect
      if (guestRoomPath && !location.pathname.startsWith(guestRoomPath)) {
        navigate(guestRoomPath, { replace: true });
        return;
      }

      // No stored room path → guest is lost; send them to sign-in
      if (!guestRoomPath) {
        navigate('/sign-in', { replace: true });
        return;
      }
    }
  }, [status, account, location, navigate, isAuthRoute]);

  if (status === 'unauthenticated' && !isAuthRoute) {
    return <AppFallback />;
  }

  return <>{children}</>;
};

export const RootWrapper = () => {
  const defaultServerService = useService(DefaultServerService);
  const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    if (isServerReady) {
      return;
    }
    const abortController = new AbortController();
    defaultServerService.server
      .waitForConfigRevalidation(abortController.signal)
      .then(() => setIsServerReady(true))
      .catch(console.error);
    return () => abortController.abort();
  }, [defaultServerService, isServerReady]);

  return (
    <FrameworkScope scope={defaultServerService.server.scope}>
      <AuthGuard>
        <GlobalDialogs />
        <NotificationCenter />
        <Outlet />
      </AuthGuard>
    </FrameworkScope>
  );
};
