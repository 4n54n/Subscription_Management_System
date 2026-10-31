import { defineModuleConfig } from '../../base';

declare global {
  interface AppConfigSchema {
    mailer: {
      SES: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        sender: string;
      };
    };
  }
}

defineModuleConfig('mailer', {
  'SES.accessKeyId': {
    desc: 'AWS Access Key ID for Amazon SES',
    default: '',
    env: 'MAILER_SES_ACCESS_KEY_ID',
  },
  'SES.secretAccessKey': {
    desc: 'AWS Secret Access Key for Amazon SES',
    default: '',
    env: 'MAILER_SES_SECRET_ACCESS_KEY',
  },
  'SES.region': {
    desc: 'AWS Region for Amazon SES (e.g. us-east-1)',
    default: 'us-east-1',
    env: 'MAILER_SES_REGION',
  },
  'SES.sender': {
    desc: 'Sender of all the emails (e.g. "Brightloop Team <noreply@brightloop.local>")',
    default: '',
    env: 'MAILER_SENDER',
  },
});

