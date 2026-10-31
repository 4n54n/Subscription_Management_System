import { z } from 'zod';

import { defineModuleConfig } from '../../base';
import '../../plugins/copilot/config';

export interface ServerFlags {
  earlyAccessControl: boolean;
}

declare global {
  interface AppConfigSchema {
    server: {
      externalUrl?: string;
      https: boolean;
      host: string;
      port: number;
      path: string;
      name?: string;
      companyName?: string;
      companyTagline?: string;
      companyLogoUrl?: string;
      companyLogoData?: string;
      linkPreviewImageUrl?: string;
      linkPreviewImageData?: string;
      oneLogoData?: string;
      cin?: string;
      pan?: string;
      gstin?: string;
      email?: string;
      supportEmail?: string;
      phone?: string;
      address?: string;
      websiteUrl?: string;
      contactUsUrl?: string;
      privacyPolicyUrl?: string;
      termsOfServiceUrl?: string;
      latePaymentFeePolicyUrl?: string;
      bankName?: string;
      bankAccountName?: string;
      bankAccountNumber?: string;
      bankIfsc?: string;
      authorizedPersonnels: ConfigItem<
        Array<{
          id: string;
          name: string;
          role: string;
          signatureData?: string;
        }>
      >;
    };
    flags: ServerFlags;
  }
}

defineModuleConfig('server', {
  name: {
    desc: 'A recognizable name for the server. Will be shown when connected with AFFiNE Desktop.',
    default: undefined,
    shape: z.string().optional(),
  },
  companyName: {
    desc: 'Official Company Name',
    default: 'Brightloop Software Solutions',
  },
  companyTagline: {
    desc: 'Company Tagline or Subtitle',
    default: 'Subscription Management & Recurring Billing ERP',
  },
  companyLogoUrl: {
    desc: 'Company Logo URL (Primary)',
    default: '',
  },
  companyLogoData: {
    desc: 'Company Logo Uploaded Base64 Data (Secondary Fallback)',
    default: '',
  },
  linkPreviewImageUrl: {
    desc: 'Link Preview Image (OG Image) URL',
    default: '',
  },
  linkPreviewImageData: {
    desc: 'Link Preview Image (OG Image) Uploaded Base64 Data',
    default: '',
  },
  oneLogoData: {
    desc: '"One" Product Logo Uploaded Base64 Data',
    default: '',
  },
  cin: {
    desc: 'Corporate Identification Number (CIN)',
    default: 'Not Found',
  },
  pan: {
    desc: 'Permanent Account Number (PAN)',
    default: 'Not Found',
  },
  gstin: {
    desc: 'GSTIN Registration Number',
    default: 'Not Found',
  },
  email: {
    desc: 'Official General Contact Email',
    default: 'connect@brightloop.local',
  },
  supportEmail: {
    desc: 'Company Support Email (used for storage increase & support requests)',
    default: 'support@brightloop.local',
  },
  phone: {
    desc: 'Official Phone Number',
    default: 'Not Found',
  },
  address: {
    desc: 'Official Company Registered Address',
    default: 'Not Found',
  },
  websiteUrl: {
    desc: 'Official Company Website URL',
    default: 'https://brightloop.local',
  },
  contactUsUrl: {
    desc: 'Contact Us Page URL',
    default: 'https://brightloop.local/contact',
  },
  privacyPolicyUrl: {
    desc: 'Privacy Policy Page URL',
    default: 'https://brightloop.local/privacy',
  },
  termsOfServiceUrl: {
    desc: 'Terms of Service Page URL',
    default: 'https://brightloop.local/terms',
  },
  latePaymentFeePolicyUrl: {
    desc: 'Late Payment Fee Policy URL (used in Overdue Payment Notice emails)',
    default: 'https://brightloop.local/terms#late-payment-policy',
  },
  bankName: {
    desc: 'Default Bank Name for Documents & Invoices',
    default: 'Not Found',
  },
  bankAccountName: {
    desc: 'Bank Account Holder Name',
    default: 'IntoAI Technologies Pvt. Ltd.',
  },
  bankAccountNumber: {
    desc: 'Bank Account Number',
    default: 'Not Found',
  },
  bankIfsc: {
    desc: 'Bank IFSC Code',
    default: 'Not Found',
  },
  authorizedPersonnels: {
    desc: 'Authorized Company Signatories and Personnels (List of { id, name, role, signatureData })',
    default: [
      {
        id: 'signatory-1',
        name: 'Ansan Mathew',
        role: 'Founder & Director',
        signatureData: '',
      },
    ],
  },
  externalUrl: {
    desc: `Base url of AFFiNE server, used for generating external urls.
Default to be \`[server.protocol]://[server.host][:server.port]\` if not specified.
    `,
    default: '',
    env: 'AFFINE_SERVER_EXTERNAL_URL',
    validate: val => {
      // allow to be nullable and empty string
      if (!val) {
        return { success: true, data: val };
      }

      return z.string().url().safeParse(val);
    },
  },
  https: {
    desc: 'Whether the server is hosted on a ssl enabled domain (https://).',
    default: false,
    env: ['AFFINE_SERVER_HTTPS', 'boolean'],
    shape: z.boolean(),
  },
  host: {
    desc: 'Where the server get deployed(FQDN).',
    default: 'localhost',
    env: 'AFFINE_SERVER_HOST',
  },
  port: {
    desc: 'Which port the server will listen on.',
    default: 3010,
    env: ['AFFINE_SERVER_PORT', 'integer'],
  },
  path: {
    desc: 'Subpath where the server get deployed if there is one.(e.g. /affine)',
    default: '',
    env: 'AFFINE_SERVER_SUB_PATH',
  },
});

defineModuleConfig('flags', {
  earlyAccessControl: {
    desc: 'Only allow users with early access features to access the app',
    default: false,
  },
});
