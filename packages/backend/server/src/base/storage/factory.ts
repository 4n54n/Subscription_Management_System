import { Injectable } from '@nestjs/common';

import {
  StorageProvider,
  StorageProviderConfig,
  StorageProviders,
} from './providers';

@Injectable()
export class StorageProviderFactory {
  create(config: StorageProviderConfig): StorageProvider {
    const providerType = (process.env.STORAGE_PROVIDER || config.provider) as keyof typeof StorageProviders;
    const Provider = StorageProviders[providerType];

    if (!Provider) {
      throw new Error(`Unknown storage provider type: ${providerType}`);
    }

    let bucket = config.bucket;
    let providerConfig = structuredClone(config.config || {});

    if (providerType === 'cloudflare-r2') {
      const envBucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
      const envAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const envAccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const envSecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

      // Priority 1: Use PostgreSQL /admin settings if provided and valid.
      // Priority 2: Fall back to .env variables if DB value is missing or old placeholder.
      if (!bucket || bucket === 'intoai-workspace-app') {
        if (envBucket && envBucket.trim()) {
          bucket = envBucket.trim();
        }
      }

      if (!(providerConfig as any).accountId) {
        if (envAccountId && envAccountId.trim()) {
          (providerConfig as any).accountId = envAccountId.trim();
        }
      }

      if (!(providerConfig as any).credentials?.accessKeyId) {
        if (envAccessKey && envAccessKey.trim()) {
          (providerConfig as any).credentials = (providerConfig as any).credentials || {};
          (providerConfig as any).credentials.accessKeyId = envAccessKey.trim();
        }
      }

      if (!(providerConfig as any).credentials?.secretAccessKey) {
        if (envSecretKey && envSecretKey.trim()) {
          (providerConfig as any).credentials = (providerConfig as any).credentials || {};
          (providerConfig as any).credentials.secretAccessKey = envSecretKey.trim();
        }
      }
    }

    return new Provider(providerConfig, bucket);
  }
}
