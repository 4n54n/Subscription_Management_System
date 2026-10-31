import {
  defineModuleConfig,
  StorageJSONSchema,
  StorageProviderConfig,
} from '../../base';

export interface Storages {
  avatar: {
    storage: ConfigItem<StorageProviderConfig>;
    publicPath: string;
  };
  blob: {
    storage: ConfigItem<StorageProviderConfig>;
  };
  d1: {
    accountId: string;
    databaseId: string;
    apiToken: string;
  };
}

declare global {
  interface AppConfigSchema {
    storages: Storages;
  }
}

defineModuleConfig('storages', {
  'avatar.publicPath': {
    desc: 'The public accessible path prefix for user avatars.',
    default: '/api/avatars/',
  },
  'avatar.storage': {
    desc: 'The config of storage for user avatars.',
    default: {
      provider: 'fs',
      bucket: 'avatars',
      config: {
        path: '~/.affine/storage',
      },
    },
    schema: StorageJSONSchema,
  },
  'blob.storage': {
    desc: 'The config of storage for all uploaded blobs(images, videos, etc.).',
    default: {
      provider: 'fs',
      bucket: 'blobs',
      config: {
        path: '~/.affine/storage',
      },
    },
    schema: StorageJSONSchema,
  },
  'd1.accountId': {
    desc: 'Cloudflare Account ID for Internship D1 Database.',
    default: '',
  },
  'd1.databaseId': {
    desc: 'Cloudflare D1 Database UUID for Internship Programs & Certificates.',
    default: '',
  },
  'd1.apiToken': {
    desc: 'Cloudflare API Token with D1 Edit permissions.',
    default: '',
  },
});

