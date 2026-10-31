import { Button } from '@affine/component/ui/button';
import { notify } from '@affine/component/ui/notification';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService, ServerService } from '@affine/core/modules/cloud';
import { UrlService } from '@affine/core/modules/url';
import { type UserFriendlyError } from '@affine/error';
import { OAuthProviderType } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { LockIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { type ReactElement, type SVGAttributes } from 'react';

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

const OAuthProviderMap: Record<
  string,
  {
    icon: ReactElement<SVGAttributes<SVGElement>>;
    label?: string;
  }
> = {
  Microsoft: {
    icon: <MicrosoftIcon />,
    label: 'Continue with Microsoft',
  },
  [OAuthProviderType.OIDC]: {
    icon: <MicrosoftIcon />,
    label: 'Continue with Microsoft',
  },
};

export function OAuth({ redirectUrl }: { redirectUrl?: string }) {
  const serverService = useService(ServerService);
  const urlService = useService(UrlService);
  const scheme = urlService.getClientScheme();
  const serverConfig = useLiveData(serverService.server.config$);
  const providers = (serverConfig?.credentials?.oauth ?? []) as OAuthProviderType[];

  if (!providers.length) {
    return null;
  }

  return providers.map(provider => (
    <OAuthProvider
      key={provider}
      provider={provider}
      redirectUrl={redirectUrl}
      scheme={scheme}
      popupWindow={url => {
        urlService.openPopupWindow(url);
      }}
    />
  ));
}

function OAuthProvider({
  provider,
  redirectUrl,
  scheme,
  popupWindow,
}: {
  provider: OAuthProviderType;
  redirectUrl?: string;
  scheme?: string;
  popupWindow: (url: string) => void;
}) {
  const serverService = useService(ServerService);
  const auth = useService(AuthService);
  const providerConfig = OAuthProviderMap[provider] || { icon: <LockIcon />, label: `Continue with ${provider}` };
  const { icon, label } = providerConfig;
  const t = useI18n();

  const onClick = useAsyncCallback(async () => {
    if (scheme && BUILD_CONFIG.isNative) {
      let oauthUrl = '';
      try {
        oauthUrl = await auth.oauthPreflight(provider, scheme);
      } catch (e) {
        console.error(e);
        const err = e as UserFriendlyError;
        notify.error({
          title: t[`error.${err.name}`](err.data),
        });
        return;
      }
      popupWindow(oauthUrl);
      return;
    }

    const params = new URLSearchParams();

    params.set('provider', provider);

    if (redirectUrl) {
      params.set('redirect_uri', redirectUrl);
    }

    if (scheme) {
      params.set('client', scheme);
    }

    // TODO: Android app scheme not implemented
    // if (BUILD_CONFIG.isAndroid) {}

    const oauthUrl =
      window.location.origin + `/oauth/login?${params.toString()}`;

    track.$.$.auth.signIn({ method: 'oauth', provider });

    if (BUILD_CONFIG.isWeb || BUILD_CONFIG.isMobileWeb) {
      window.location.href = oauthUrl;
    } else {
      popupWindow(oauthUrl);
    }
  }, [popupWindow, provider, redirectUrl, scheme, serverService, auth, t]);

  return (
    <Button
      key={provider}
      variant="primary"
      block
      size="extraLarge"
      style={{
        width: '100%',
        height: '52px',
        background: '#0565ff',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: 700,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxShadow: '0 4px 14px rgba(5, 101, 255, 0.3)',
        border: 'none',
      }}
      prefix={icon}
      suffix={<span style={{ fontSize: '18px', fontWeight: 700 }}>→</span>}
      onClick={onClick}
    >
      {label || `Continue with ${provider}`}
    </Button>
  );
}
