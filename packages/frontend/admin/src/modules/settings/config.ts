import { upperFirst } from 'lodash-es';
import type { ComponentType } from 'react';

import CONFIG_DESCRIPTORS from '../../config.json';
import type { ConfigInputProps } from './config-input-row';
import { SendTestEmail } from './operations/send-test-email';
import { MailTesting } from './operations/mail-testing';
import { MeetingCleanup } from './operations/meeting-cleanup';
import { TestServerSsh } from './operations/test-server-ssh';
import { ManageAuthorizedPersonnels } from './operations/manage-authorized-personnels';

export type ConfigType = 'String' | 'Number' | 'Boolean' | 'JSON' | 'Enum';

type ConfigDescriptor = {
  desc: string;
  type: ConfigType;
  env?: string;
  link?: string;
};

export type AppConfig = Record<string, Record<string, any>>;

type AppConfigDescriptors = typeof CONFIG_DESCRIPTORS;
type AppConfigModule = keyof AppConfigDescriptors;
type ModuleConfigDescriptors<M extends AppConfigModule> =
  AppConfigDescriptors[M];
type ConfigGroup<T extends AppConfigModule> = {
  id?: string;
  name: string;
  module: T;
  operationsPosition?: 'top' | 'bottom';
  fields: Array<
    | keyof ModuleConfigDescriptors<T>
    | ({
        key: keyof ModuleConfigDescriptors<T>;
        sub?: string;
        desc?: string;
      } & Partial<ConfigInputProps>)
  >;
  operations?: ComponentType<{
    appConfig: AppConfig;
    onUpdate?: (path: string, value: any) => void;
  }>[];
};
const IGNORED_MODULES: (keyof AppConfig)[] = [
  'copilot', // not ready
];

if (environment.isSelfHosted) {
  IGNORED_MODULES.push('payment');
}

const ALL_CONFIGURABLE_MODULES = Object.keys(CONFIG_DESCRIPTORS).filter(
  key => !IGNORED_MODULES.includes(key as keyof AppConfig)
);

export const KNOWN_CONFIG_GROUPS = [
  {
    id: 'server',
    name: 'Server',
    module: 'server',
    fields: [
      'externalUrl',
      'name',
    ],
    operations: [TestServerSsh],
  } as ConfigGroup<'server'>,
  {
    id: 'company',
    name: 'Company Details',
    module: 'server',
    operationsPosition: 'top',
    fields: [
      'companyName',
      'companyTagline',
      'companyLogoUrl',
      'companyLogoData',
      'linkPreviewImageUrl',
      'linkPreviewImageData',
      'oneLogoData',
      'cin',
      'pan',
      'gstin',
      'email',
      'supportEmail',
      'phone',
      'address',
      'websiteUrl',
      'contactUsUrl',
      'privacyPolicyUrl',
      'termsOfServiceUrl',
      'latePaymentFeePolicyUrl',
      'bankName',
      'bankAccountName',
      'bankAccountNumber',
      'bankIfsc',
    ],
    operations: [ManageAuthorizedPersonnels],
  } as ConfigGroup<'server'>,
  {
    name: 'Auth',
    module: 'auth',
    fields: [
      'allowSignup',
      // nested json object
      {
        key: 'passwordRequirements',
        sub: 'min',
        type: 'Number',
        desc: 'Minimum length requirement of password',
      },
      {
        key: 'passwordRequirements',
        sub: 'max',
        type: 'Number',
        desc: 'Maximum length requirement of password',
      },
    ],
  } as ConfigGroup<'auth'>,
  {
    id: 'phish',
    name: 'Phish Auth',
    module: 'phish',
    fields: [
      'enabled',
      'tenantId',
      'clientId',
      'clientSecret',
    ],
  } as ConfigGroup<'phish'>,
  {
    name: 'Notification',
    module: 'mailer',
    fields: [
      'SES.accessKeyId',
      'SES.secretAccessKey',
      'SES.region',
      'SES.sender',
    ],
    operations: [SendTestEmail, MailTesting],
  } as ConfigGroup<'mailer'>,
  {
    name: 'Storage',
    module: 'storages',
    fields: [
      {
        key: 'blob.storage',
        desc: 'The storage provider for user uploaded blobs',
        sub: 'provider',
        type: 'Enum',
        options: ['fs', 'aws-s3', 'cloudflare-r2'],
      },
      {
        key: 'blob.storage',
        sub: 'bucket',
        type: 'String',
        desc: 'The bucket name for user uploaded blobs storage',
      },
      {
        key: 'blob.storage',
        sub: 'config',
        type: 'JSON',
        desc: 'The config passed directly to the storage provider(e.g. aws-sdk)',
      },
      {
        key: 'avatar.storage',
        desc: 'The storage provider for user avatars',
        sub: 'provider',
        type: 'Enum',
        options: ['fs', 'aws-s3', 'cloudflare-r2'],
      },
      {
        key: 'avatar.storage',
        sub: 'bucket',
        type: 'String',
        desc: 'The bucket name for user avatars storage',
      },
      {
        key: 'avatar.storage',
        sub: 'config',
        type: 'JSON',
        desc: 'The config passed directly to the storage provider(e.g. aws-sdk)',
      },
      {
        key: 'avatar.publicPath',
        type: 'String',
        desc: 'The public path prefix for user avatars(e.g. https://my-bucket.s3.amazonaws.com/)',
      },
      {
        key: 'd1.accountId',
        type: 'String',
        desc: 'Cloudflare Account ID for Internship D1 Database',
      },
      {
        key: 'd1.databaseId',
        type: 'String',
        desc: 'Cloudflare D1 Database UUID for Internship Programs & Certificates',
      },
      {
        key: 'd1.apiToken',
        type: 'String',
        desc: 'Cloudflare API Token with D1 Edit permissions',
      },
    ],
  } as ConfigGroup<'storages'>,
  {
    name: 'OAuth',
    module: 'oauth',
    fields: ['providers.microsoft'],
  } as ConfigGroup<'oauth'>,

  {
    id: 'agora',
    name: 'Video & Meeting Settings',
    module: 'agora',
    fields: ['appId', 'appCertificate', 'customerId', 'customerSecret'],
    operations: [MeetingCleanup],
  } as ConfigGroup<'agora'>,
];

export const UNKNOWN_CONFIG_GROUPS = ALL_CONFIGURABLE_MODULES.filter(
  module => !KNOWN_CONFIG_GROUPS.some(group => group.module === module)
).map(module => ({
  name: upperFirst(module),
  module,
  // @ts-expect-error allow
  fields: Object.keys(CONFIG_DESCRIPTORS[module]),
  operations: undefined,
}));

export const ALL_SETTING_GROUPS = [
  ...KNOWN_CONFIG_GROUPS,
  ...UNKNOWN_CONFIG_GROUPS,
];

export const ALL_CONFIG_DESCRIPTORS = CONFIG_DESCRIPTORS as Record<
  string,
  Record<string, ConfigDescriptor>
>;
