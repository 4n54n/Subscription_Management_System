import { z } from 'zod';
import { defineModuleConfig } from '../../base';

declare global {
  interface AppConfigSchema {
    phish: {
      enabled: boolean;
      tenantId: string;
      clientId: string;
      clientSecret: string;
      model: string;
    };
  }
}

defineModuleConfig('phish', {
  enabled: {
    desc: 'Enable Microsoft Mail Phishing Monitoring and AI Threat Inspection',
    default: false,
    env: 'MICROSOFT_PHISH_ENABLED',
    shape: z.boolean(),
  },
  tenantId: {
    desc: 'Microsoft Azure Directory (Tenant) ID',
    default: '',
    env: 'MICROSOFT_PHISH_TENANT_ID',
    shape: z.string(),
  },
  clientId: {
    desc: 'Microsoft Azure Application (Client) ID',
    default: '',
    env: 'MICROSOFT_PHISH_CLIENT_ID',
    shape: z.string(),
  },
  clientSecret: {
    desc: 'Microsoft Azure Application Secret Value',
    default: '',
    env: 'MICROSOFT_PHISH_CLIENT_SECRET',
    shape: z.string(),
  },
  model: {
    desc: 'Selected Google Gemini AI Model for Phishing Email Inspection',
    default: 'gemini-2.5-flash',
    env: 'MICROSOFT_PHISH_MODEL',
    shape: z.string(),
  },
});
