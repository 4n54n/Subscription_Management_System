import { NotificationCenter } from '@affine/component';
import { DefaultServerService, AuthService } from '@affine/core/modules/cloud';
import { FrameworkScope, useService, useLiveData } from '@toeverything/infra';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { GlobalDialogs } from '../../dialogs';
import { CustomThemeModifier } from './custom-theme';
import { FindInPagePopup } from './find-in-page/find-in-page-popup';

import { AppContainer } from '../../components/app-container';

/** Routes that are accessible without being logged in */
const UNAUTH_ROUTES = [
  '/sign-in',
  '/signIn',
  '/desktop-signin',
  '/magic-link',
  '/oauth/login',
  '/oauth/callback',
  '/join',
];

const isUnauthRoute = (pathname: string, search: string) =>
  UNAUTH_ROUTES.some(
    r => pathname.startsWith(r) || pathname.startsWith('/auth/')
  ) ||
  /\/workspace\/[^/]+\/present\/[^/]+/.test(pathname) ||
  search.includes('shareKey=');

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const authService = useService(AuthService);
  const status = useLiveData(authService.session.status$);
  const account = useLiveData(authService.session.account$);
  const navigate = useNavigate();
  const location = useLocation();
  // Safety net: throttle redirects to /sign-in to prevent the browser from
  // hanging if auth state flaps between authenticated/unauthenticated.
  const lastRedirectRef = useRef<number>(0);

  useEffect(() => {
    const pathname = location.pathname;

    // ── 1. Unauthenticated users → sign-in (except whitelisted routes) ──────
    if (status === 'unauthenticated' && !isUnauthRoute(pathname, location.search)) {
      const now = Date.now();
      if (now - lastRedirectRef.current < 2000) {
        return; // Throttle: don't redirect again within 2 seconds
      }
      lastRedirectRef.current = now;
      navigate(
        `/sign-in?redirect_uri=${encodeURIComponent(pathname + location.search)}`,
        { replace: true }
      );
      return;
    }

    // ── 2. Guest presentation users → lock to their room only ───────────────
    // Guest accounts are identified by their email suffix @guest.presentation
    // The room path is written to sessionStorage by the join page.
    const isGuest = account?.email?.endsWith('@guest.presentation') ?? false;
    if (isGuest && status === 'authenticated') {
      const guestRoomPath = sessionStorage.getItem('presentation_room_path');

      // If they are on a join/whitelisted route, do not force redirect yet
      if (isUnauthRoute(pathname, location.search)) {
        return;
      }

      // If we have a stored room path and the current path isn't that room → redirect
      if (guestRoomPath && !pathname.startsWith(guestRoomPath)) {
        navigate(guestRoomPath, { replace: true });
        return;
      }

      // No stored room path → guest is lost; send them to sign-in
      if (!guestRoomPath) {
        navigate('/sign-in', { replace: true });
        return;
      }
    }
  }, [status, account, location, navigate]);

  // Unauthenticated on a protected route → render loading while redirect happens
  if (status === 'unauthenticated' && !isUnauthRoute(location.pathname, location.search)) {
    return <AppContainer fallback />;
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
        <CustomThemeModifier />
        {BUILD_CONFIG.isElectron && <FindInPagePopup />}
      </AuthGuard>
    </FrameworkScope>
  );
};
