import { Injectable } from '@nestjs/common';

import { InvalidOauthCallbackCode, URLHelper } from '../../../base';
import { OAuthProviderName } from '../config';
import { OAuthProvider } from './def';

interface MicrosoftOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface MicrosoftUserInfo {
  id: string;
  userPrincipalName: string;
  mail?: string;
  displayName?: string;
}

@Injectable()
export class MicrosoftOAuthProvider extends OAuthProvider {
  override provider = OAuthProviderName.Microsoft;

  constructor(private readonly url: URLHelper) {
    super();
  }

  private get clientId(): string {
    return (
      this.config?.clientId ||
      process.env.AFFINE_OAUTH_MICROSOFT_CLIENT_ID ||
      process.env.MICROSOFT_CLIENT_ID ||
      ''
    );
  }

  private get clientSecret(): string {
    return (
      this.config?.clientSecret ||
      process.env.AFFINE_OAUTH_MICROSOFT_CLIENT_SECRET ||
      process.env.MICROSOFT_CLIENT_SECRET ||
      ''
    );
  }

  private get tenantId(): string {
    return (
      (this.config?.args as Record<string, string> | undefined)?.tenantId ||
      process.env.AFFINE_OAUTH_MICROSOFT_TENANT_ID ||
      process.env.MICROSOFT_TENANT_ID ||
      'common'
    );
  }

  private get redirectUri(): string {
    if (process.env.AFFINE_OAUTH_MICROSOFT_REDIRECT_URI) {
      return process.env.AFFINE_OAUTH_MICROSOFT_REDIRECT_URI;
    }
    if (process.env.MICROSOFT_REDIRECT_URI) {
      return process.env.MICROSOFT_REDIRECT_URI;
    }
    const link = this.url.link('/oauth/callback');
    if (link.includes('localhost:3010')) {
      return link.replace('localhost:3010', 'localhost:8080');
    }
    return link;
  }

  getAuthUrl(state: string) {
    if (!this.clientId) {
      throw new Error(
        'Microsoft OAuth is not configured. Please enter Client ID and Client Secret in Admin Settings or .env file.'
      );
    }

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${this.url.stringify({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile email User.Read',
      response_mode: 'query',
      prompt: 'select_account',
      ...this.config?.args,
      state,
    })}`;
  }

  async getToken(code: string) {
    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        body: this.url.stringify({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.ok) {
      const token = (await response.json()) as MicrosoftOAuthTokenResponse;

      return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
      };
    } else {
      const body = await response.text();
      if (response.status < 500) {
        throw new InvalidOauthCallbackCode({ status: response.status, body });
      }
      throw new Error(
        `Server responded with non-success status ${response.status}, body: ${body}`
      );
    }
  }

  async getUser(token: string) {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const user = (await response.json()) as MicrosoftUserInfo;

      return {
        id: user.id,
        avatarUrl: undefined,
        email: user.mail || user.userPrincipalName,
      };
    } else {
      throw new Error(
        `Server responded with non-success code ${
          response.status
        } ${await response.text()}`
      );
    }
  }
}
