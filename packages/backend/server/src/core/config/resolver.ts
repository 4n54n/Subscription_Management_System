import { merge } from 'lodash-es';
import {
  Args,
  Field,
  GraphQLISODateTime,
  InputType,
  Mutation,
  ObjectType,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-scalars';

import { Config, URLHelper } from '../../base';
import { Feature } from '../../models';
import { Public } from '../auth/guard';
import { CurrentUser } from '../auth/session';
import { Admin } from '../common';
import { AvailableUserFeatureConfig } from '../features';
import { ServerService } from './service';
import { ServerConfigType } from './types';

@ObjectType()
export class PasswordLimitsType {
  @Field()
  minLength!: number;
  @Field()
  maxLength!: number;
}

@ObjectType()
export class CredentialsRequirementType {
  @Field()
  password!: PasswordLimitsType;
}

@ObjectType()
export class ReleaseVersionType {
  @Field()
  version!: string;

  @Field()
  url!: string;

  @Field(() => GraphQLISODateTime)
  publishedAt!: Date;

  @Field()
  changelog!: string;
}

@Resolver(() => ServerConfigType)
export class ServerConfigResolver {
  constructor(
    private readonly config: Config,
    private readonly url: URLHelper,
    private readonly server: ServerService
  ) {}

  @Public()
  @Query(() => ServerConfigType, {
    description: 'server config',
  })
  serverConfig(): ServerConfigType {
    return {
      name:
        this.config.server.name ??
        (env.selfhosted
          ? 'Brightloop Selfhosted Cloud'
          : env.namespaces.canary
            ? 'Brightloop Canary Cloud'
            : env.namespaces.beta
              ? 'Brightloop Beta Cloud'
              : 'Brightloop Cloud'),
      version: env.version,
      baseUrl: this.url.home,
      type: env.DEPLOYMENT_TYPE,
      features: this.server.features,
    };
  }

  @Public()
  @Query(() => ServerConfigType, {
    name: 'adminServerConfig',
    description: 'admin server config (alias for serverConfig)',
  })
  adminServerConfig(): ServerConfigType {
    return this.serverConfig();
  }

  @ResolveField(() => CredentialsRequirementType, {
    description: 'credentials requirement',
  })
  async credentialsRequirement() {
    return {
      password: {
        minLength: this.config.auth.passwordRequirements.min,
        maxLength: this.config.auth.passwordRequirements.max,
      },
    };
  }

  @ResolveField(() => Boolean, {
    description: 'whether server has been initialized',
  })
  async initialized() {
    return this.server.initialized();
  }

  @ResolveField(() => ReleaseVersionType, {
    nullable: true,
    description: 'fetch latest available upgradable release of server',
  })
  async availableUpgrade(): Promise<ReleaseVersionType | null> {
    return null;
  }
}

@Resolver(() => ServerConfigType)
export class ServerFeatureConfigResolver extends AvailableUserFeatureConfig {
  @ResolveField(() => [Feature], {
    description: 'Features for user that can be configured',
  })
  override availableUserFeatures() {
    return super.availableUserFeatures();
  }
}

@InputType()
class UpdateAppConfigInput {
  @Field()
  module!: string;

  @Field()
  key!: string;

  @Field(() => GraphQLJSON)
  value!: any;
}

@Resolver(() => GraphQLJSONObject)
export class AppConfigResolver {
  constructor(private readonly service: ServerService) {}

  @Public()
  @Query(() => GraphQLJSONObject, {
    description: 'get public company profile details for documents',
  })
  async companyProfile() {
    const dbOverrides = await this.service.loadDbOverrides();
    const config = this.service.getConfig();
    const s = {
      ...((config as any).server || {}),
      ...((dbOverrides as any).server || {}),
    };
    return {
      companyName: s.companyName || 'Brightloop Software Solutions',
      companyTagline: s.companyTagline || 'Subscription Management & Recurring Billing ERP',
      companyLogoUrl: s.companyLogoUrl || '',
      companyLogoData: s.companyLogoData || '',
      oneLogoData: s.oneLogoData || '',
      cin: s.cin || 'U72900KA2023PTC174829',
      pan: s.pan || 'AAACI4567B',
      gstin: s.gstin || '29AAACI4567B1Z4',
      email: s.email || 'connect@brightloop.local',
      supportEmail: s.supportEmail || 'support@brightloop.local',
      phone: s.phone || '+91 7510711617',
      address: s.address || 'No.472/7 Balaji Arcade, 2nd & 3rd Floor, Koramangala, Bangalore — 560095',
      websiteUrl: s.websiteUrl || 'https://brightloop.local',
      contactUsUrl: s.contactUsUrl || 'https://brightloop.local/contact',
      privacyPolicyUrl: s.privacyPolicyUrl || 'https://brightloop.local/privacy',
      termsOfServiceUrl: s.termsOfServiceUrl || 'https://brightloop.local/terms',
      latePaymentFeePolicyUrl: s.latePaymentFeePolicyUrl || 'https://brightloop.local/terms#late-payment-policy',
      bankName: s.bankName || 'ICICI Bank',
      bankAccountName: s.bankAccountName || 'Brightloop Software Solutions',
      bankAccountNumber: s.bankAccountNumber || '98765432101',
      bankIfsc: s.bankIfsc || 'ICIC0000104',
      authorizedPersonnels: s.authorizedPersonnels || [],
    };
  }

  @Admin()
  @Query(() => GraphQLJSONObject, {
    description: 'get the whole app configuration',
  })
  async appConfig(): Promise<Record<string, any>> {
    const dbOverrides = await this.service.loadDbOverrides();
    const config = this.service.getConfig();
    return merge({}, config, dbOverrides);
  }

  @Admin()
  @Mutation(() => GraphQLJSONObject, {
    description: 'update app configuration',
  })
  async updateAppConfig(
    @CurrentUser() me: CurrentUser,
    @Args('updates', { type: () => [UpdateAppConfigInput] })
    updates: UpdateAppConfigInput[]
  ): Promise<DeepPartial<AppConfig>> {
    return await this.service.updateConfig(me.id, updates);
  }
}
