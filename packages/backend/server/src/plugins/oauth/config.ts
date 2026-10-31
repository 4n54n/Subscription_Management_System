import { defineModuleConfig, JSONSchema } from '../../base';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  args?: Record<string, string>;
}

export type OIDCArgs = {
  scope?: string;
  claim_id?: string;
  claim_email?: string;
  claim_name?: string;
};

export interface OAuthOIDCProviderConfig extends OAuthProviderConfig {
  issuer: string;
  args?: OIDCArgs;
}

export enum OAuthProviderName {
  Microsoft = 'microsoft',
  OIDC = 'oidc',
}
declare global {
  interface AppConfigSchema {
    oauth: {
      providers: {
        [OAuthProviderName.Microsoft]: ConfigItem<OAuthProviderConfig>;
      };
    };
  }
}

const schema: JSONSchema = {
  type: 'object',
  properties: {
    clientId: { type: 'string' },
    clientSecret: { type: 'string' },
    args: { type: 'object' },
  },
};

defineModuleConfig('oauth', {
  'providers.microsoft': {
    desc: 'Microsoft OAuth provider config (Entra ID)',
    default: {
      clientId: process.env.AFFINE_OAUTH_MICROSOFT_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.AFFINE_OAUTH_MICROSOFT_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || '',
      args: {
        tenantId: process.env.AFFINE_OAUTH_MICROSOFT_TENANT_ID || process.env.MICROSOFT_TENANT_ID || 'common',
      },
    },
    schema,
    link: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow',
  },
});
