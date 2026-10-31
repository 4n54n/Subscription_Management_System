import { useService } from '@toeverything/infra';
import { useEffect, useRef } from 'react';
import {
  type LoaderFunction,
  redirect,
  useLoaderData,
  useNavigate,
} from 'react-router-dom';

import { AuthService } from '../../../modules/cloud';
import { supportedClient } from './common';

interface LoaderData {
  state: string;
  code: string;
  provider: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const queries = url.searchParams;
  const code = queries.get('code');
  let stateStr = queries.get('state') ?? '{}';
  const errorParam = queries.get('error_description') || queries.get('error');

  if (errorParam) {
    return redirect(`/sign-in?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !stateStr || stateStr === '{}') {
    return redirect('/sign-in?error=Invalid oauth callback parameters');
  }

  let parsedState: any = null;
  try {
    parsedState = JSON.parse(stateStr);
  } catch {
    parsedState = null;
  }

  const state = (parsedState && typeof parsedState === 'object' && parsedState.state) ? parsedState.state : stateStr;
  const client = (parsedState && typeof parsedState === 'object' && parsedState.client) ? parsedState.client : (queries.get('client') || 'web');
  const provider = (parsedState && typeof parsedState === 'object' && parsedState.provider) ? parsedState.provider : (queries.get('provider') || 'Microsoft');

  const payload: LoaderData = {
    state,
    code,
    provider,
  };

  if (!client || client === 'web') {
    return payload;
  }

  const clientCheckResult = supportedClient.safeParse(client);
  if (!clientCheckResult.success) {
    return redirect('/sign-in?error=Invalid oauth callback parameters');
  }

  const authParams = new URLSearchParams();
  authParams.set('method', 'oauth');
  authParams.set('payload', JSON.stringify(payload));
  authParams.set('server', location.origin);

  return redirect(
    `/open-app/url?url=${encodeURIComponent(`${client}://authentication?${authParams.toString()}`)}`
  );
};

export const Component = () => {
  const auth = useService(AuthService);
  const data = useLoaderData() as LoaderData;

  // loader data from useLoaderData is not reactive, so that we can safely
  // assume the effect below is only triggered once
  const triggeredRef = useRef(false);

  const nav = useNavigate();

  useEffect(() => {
    if (triggeredRef.current) {
      return;
    }
    triggeredRef.current = true;
    auth
      .signInOauth(data.code, data.state, data.provider)
      .then((res: any) => {
        let targetUrl = '/';
        if (res?.redirectUri) {
          try {
            const u = new URL(res.redirectUri, window.location.origin);
            const target = u.searchParams.get('redirect_uri');
            if (target && !target.startsWith('/sign-in') && !target.startsWith('/signIn')) {
              targetUrl = target;
            } else if (!u.pathname.startsWith('/sign-in') && !u.pathname.startsWith('/signIn')) {
              targetUrl = res.redirectUri;
            }
          } catch {
            targetUrl = res.redirectUri;
          }
        }

        // 1. Send OAUTH_SUCCESS message to parent window if opened in a popup
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              redirectUri: targetUrl
            }, '*');
          } catch (e) {}
        }

        // 2. Broadcast oauth success to other tabs/windows via localStorage
        try {
          localStorage.setItem('affine:oauth_success', Date.now().toString());
        } catch (e) {}

        // 3. Try closing popup window
        window.close();

        // 4. Navigate immediately if not a popup or window remains open
        setTimeout(() => {
          if (!window.closed) {
            window.location.href = targetUrl;
          }
        }, 150);
      })
      .catch(e => {
        nav(`/sign-in?error=${encodeURIComponent(e.message)}`);
      });
  }, [data, auth, nav]);

  return null;
};
