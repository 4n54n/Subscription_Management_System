import {
  defineModuleConfig,
  StorageJSONSchema,
  StorageProviderConfig,
} from '../../base';
import type { FalConfig } from './providers/fal';
import { GeminiConfig } from './providers/gemini';
import { OpenAIConfig } from './providers/openai';
import { PerplexityConfig } from './providers/perplexity';

declare global {
  interface AppConfigSchema {
    copilot: {
      enabled: boolean;
      intelligentFallbackEnabled: boolean;
      researchDocModel: string;
      availableTextModels: ConfigItem<Array<{ name: string; displayName: string }>>;
      outputTokenLimit: number;
      sshHost: string;
      sshUser: string;
      sshPass: string;
      unsplash: ConfigItem<{
        key: string;
      }>;
      storage: ConfigItem<StorageProviderConfig>;
      providers: {
        openai: ConfigItem<OpenAIConfig>;
        fal: ConfigItem<FalConfig>;
        gemini: ConfigItem<GeminiConfig>;
        perplexity: ConfigItem<PerplexityConfig>;
      };
    };
  }
}

defineModuleConfig('copilot', {
  enabled: {
    desc: 'Whether to enable the copilot plugin.',
    default: true,
  },
  intelligentFallbackEnabled: {
    desc: 'Whether to enable intelligent model fallback for AI features.',
    default: true,
  },
  researchDocModel: {
    desc: 'Default Gemini model for Research Document Copilot.',
    default: 'gemini-2.5-flash',
  },
  availableTextModels: {
    desc: 'List of available synced Gemini text models.',
    default: [] as Array<{ name: string; displayName: string }>,
  },
  outputTokenLimit: {
    desc: 'Default maximum token output limit for AI responses.',
    default: 200,
  },
  sshHost: {
    desc: 'Default SSH Host for workspace test server sandbox.',
    default: '',
  },
  sshUser: {
    desc: 'Default SSH Username for workspace test server sandbox.',
    default: '',
  },
  sshPass: {
    desc: 'Default SSH Password for workspace test server sandbox.',
    default: '',
  },
  'providers.openai': {
    desc: 'The config for the openai provider.',
    default: {
      apiKey: '',
    },
    link: 'https://github.com/openai/openai-node',
  },
  'providers.fal': {
    desc: 'The config for the fal provider.',
    default: {
      apiKey: '',
    },
  },
  'providers.gemini': {
    desc: 'The config for the gemini provider.',
    default: {
      apiKey: '',
      model: 'gemini-2.5-flash',
    },
  },
  'providers.perplexity': {
    desc: 'The config for the perplexity provider.',
    default: {
      apiKey: '',
    },
  },
  unsplash: {
    desc: 'The config for the unsplash key.',
    default: {
      key: '',
    },
  },
  storage: {
    desc: 'The config for the storage provider.',
    default: {
      provider: 'fs',
      bucket: 'copilot',
      config: {
        path: '~/.affine/storage',
      },
    },
    schema: StorageJSONSchema,
  },
});
