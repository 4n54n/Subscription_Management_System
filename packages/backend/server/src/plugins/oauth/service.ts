import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { SessionCache } from '../../base';
import { OAuthProviderName } from './config';
import { OAuthProviderFactory } from './factory';

const OAUTH_STATE_KEY = 'OAUTH_STATE';

interface OAuthState {
  redirectUri?: string;
  client?: string;
  clientNonce?: string;
  provider: OAuthProviderName;
}

@Injectable()
export class OAuthService {
  constructor(
    private readonly providerFactory: OAuthProviderFactory,
    private readonly cache: SessionCache
  ) {}

  isValidState(stateStr: string) {
    if (!stateStr) return false;
    let token = stateStr;
    try {
      const parsed = JSON.parse(stateStr);
      if (parsed && typeof parsed === 'object' && parsed.state) {
        token = parsed.state;
      }
    } catch {}
    return typeof token === 'string' && token.length === 36;
  }

  async saveOAuthState(state: OAuthState) {
    const token = randomUUID();
    await this.cache.set(`${OAUTH_STATE_KEY}:${token}`, state, {
      ttl: 3600 * 3 * 1000 /* 3 hours */,
    });

    return token;
  }

  async getOAuthState(token: string) {
    let key = token;
    try {
      const parsed = JSON.parse(token);
      if (parsed && typeof parsed === 'object' && parsed.state) {
        key = parsed.state;
      }
    } catch {}
    return this.cache.get<OAuthState>(`${OAUTH_STATE_KEY}:${key}`);
  }

  availableOAuthProviders() {
    return this.providerFactory.providers;
  }
}
