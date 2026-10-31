import { defineModuleConfig } from '../../base';

declare global {
  interface AppConfigSchema {
    agora: {
      appId?: string;
      appCertificate?: string;
      customerId?: string;
      customerSecret?: string;
    };
  }
}

defineModuleConfig('agora', {
  appId: {
    desc: 'Agora App ID for Video & Audio live meeting rooms',
    default: '',
    env: 'AGORA_APP_ID',
  },
  appCertificate: {
    desc: 'Agora Primary App Certificate for production token authentication',
    default: '',
    env: 'AGORA_APP_CERTIFICATE',
  },
  customerId: {
    desc: 'Agora REST / STT Customer ID (optional)',
    default: '',
    env: 'AGORA_CUSTOMER_ID',
  },
  customerSecret: {
    desc: 'Agora REST / STT Customer Secret (optional)',
    default: '',
    env: 'AGORA_CUSTOMER_SECRET',
  },
});

