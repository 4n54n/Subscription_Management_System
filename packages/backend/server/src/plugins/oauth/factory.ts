import { Injectable, Logger } from '@nestjs/common';

import { ServerFeature, ServerService } from '../../core';
import { OAuthProviderName } from './config';
import type { OAuthProvider } from './providers/def';

@Injectable()
export class OAuthProviderFactory {
  constructor(private readonly server: ServerService) {}

  private readonly logger = new Logger(OAuthProviderFactory.name);
  readonly #providers = new Map<OAuthProviderName, OAuthProvider>();

  get providers() {
    return Array.from(this.#providers.keys());
  }

  get(name: string): OAuthProvider | undefined {
    const direct = this.#providers.get(name as OAuthProviderName);
    if (direct) return direct;
    const lower = name.toLowerCase();
    for (const [key, provider] of this.#providers.entries()) {
      if (String(key).toLowerCase() === lower) {
        return provider;
      }
    }
    return undefined;
  }

  register(provider: OAuthProvider) {
    this.#providers.set(provider.provider, provider);
    this.logger.log(`OAuth provider [${provider.provider}] registered.`);
    this.server.enableFeature(ServerFeature.OAuth);
  }

  unregister(provider: OAuthProvider) {
    this.#providers.delete(provider.provider);
    this.logger.log(`OAuth provider [${provider.provider}] unregistered.`);
    if (this.#providers.size === 0) {
      this.server.disableFeature(ServerFeature.OAuth);
    }
  }
}
