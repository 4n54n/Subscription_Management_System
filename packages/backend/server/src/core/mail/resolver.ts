import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

import { BadRequest } from '../../base';
import { Renderers } from '../../mails';
import { CurrentUser } from '../auth/session';
import { Admin } from '../common';
import { ServerService } from '../config/service';
import { MailSender } from './sender';

@Admin()
@Resolver(() => Boolean)
export class MailResolver {
  constructor(private readonly serverService?: ServerService) {}

  @Query(() => [String])
  async availableMailTemplates() {
    return Object.keys(Renderers);
  }

  @Mutation(() => Boolean)
  async sendTestEmail(
    @CurrentUser() user: CurrentUser,
    @Args('config', { type: () => GraphQLJSONObject })
    config: AppConfig['mailer']['SES']
  ) {
    const ses = MailSender.create(config);

    if (!ses) {
      throw new BadRequest(
        'AWS SES Access Key ID and Secret Access Key are required.'
      );
    }

    using _disposable = {
      [Symbol.dispose]: () => {
        ses.close();
      },
    };

    try {
      await ses.sendMail({
        from: config.sender,
        to: user.email,
        ...(await Renderers.TestMail({})),
      });
    } catch (e) {
      throw new BadRequest(
        `Failed to send test email via Amazon SES. Cause: ${(e as Error).message}`
      );
    }

    return true;
  }

  @Mutation(() => Boolean)
  async sendTestMailTemplate(
    @CurrentUser() user: CurrentUser,
    @Args('config', { type: () => GraphQLJSONObject })
    config: AppConfig['mailer']['SES'],
    @Args('template', { type: () => String })
    template: string
  ) {
    const ses = MailSender.create(config);

    if (!ses) {
      throw new BadRequest(
        'AWS SES Access Key ID and Secret Access Key are required.'
      );
    }

    using _disposable = {
      [Symbol.dispose]: () => {
        ses.close();
      },
    };

    try {
      const serverConfig = this.serverService?.getConfig()?.server;
      if (serverConfig) {
        (globalThis as any).serverConfig = serverConfig;
      }
    } catch {
      // ignore
    }

    const renderer = (Renderers as any)[template];
    if (!renderer) {
      throw new BadRequest(`Mail template ${template} not found.`);
    }

    const { MOCK_DATA_MAP } = await import('../../mails/mock-data');
    const props = { ...(MOCK_DATA_MAP[template] || {}) };

    const configData = this.serverService?.getConfig() as any;
    const dbOverrides = this.serverService?.getDbOverrides() as any;
    const serverSettings = {
      ...(configData?.server || {}),
      ...(dbOverrides?.server || {}),
      ...(configData || {}),
      ...(dbOverrides || {}),
    };

    if (template === 'OverduePaymentNotice') {
      const realPolicyUrl =
        serverSettings.latePaymentFeePolicyUrl ||
        serverSettings.company?.latePaymentFeePolicyUrl ||
        serverSettings.termsOfServiceUrl;
      if (realPolicyUrl) {
        props.latePaymentPolicyUrl = realPolicyUrl;
      }
      if (serverSettings.companyName || serverSettings.name) {
        props.companyName = serverSettings.companyName || serverSettings.name;
      }
      if (serverSettings.email || serverSettings.companyMail) {
        props.companyEmail = serverSettings.email || serverSettings.companyMail;
      }
    } else if (template === 'PaymentReceipt' || template === 'RecurringInvoice') {
      if (serverSettings.companyName || serverSettings.name) {
        props.companyName = serverSettings.companyName || serverSettings.name;
      }
      if (serverSettings.email || serverSettings.companyMail) {
        props.companyEmail = serverSettings.email || serverSettings.companyMail;
      }
    }

    try {
      const emailContent = await renderer(props);
      await ses.sendMail({
        from: config.sender,
        to: user.email,
        ...emailContent,
      });
    } catch (e) {
      throw new BadRequest(
        `Failed to send test email template ${template} via Amazon SES. Cause: ${(e as Error).message}`
      );
    }

    return true;
  }
}

