import * as aws from '@aws-sdk/client-ses';
import { Injectable, Logger } from '@nestjs/common';
import { createTransport, SendMailOptions, Transporter } from 'nodemailer';

import { Config, metrics, OnEvent } from '../../base';

export type SendOptions = Omit<SendMailOptions, 'to' | 'subject' | 'html'> & {
  to: string;
  subject: string;
  html: string;
};

@Injectable()
export class MailSender {
  private readonly logger = new Logger(MailSender.name);
  private sesTransporter: Transporter | null = null;
  constructor(private readonly config: Config) {}

  static create(config: Config['mailer']['SES']) {
    if (!config.accessKeyId || !config.secretAccessKey) {
      return null;
    }
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    return createTransport({
      SES: { ses, aws },
    });
  }

  get enabled() {
    return this.sesTransporter !== null;
  }

  @OnEvent('config.init')
  onConfigInit() {
    this.setup();
  }

  @OnEvent('config.changed')
  onConfigChanged(event: Events['config.changed']) {
    if ('mailer' in event.updates) {
      this.setup();
    }
  }

  private setup() {
    const { SES } = this.config.mailer;
    if (SES && SES.accessKeyId && SES.secretAccessKey) {
      this.sesTransporter = MailSender.create(SES);
    } else {
      this.logger.warn('Mailer Amazon SES transport is not configured.');
      this.sesTransporter = null;
    }
  }

  async send(name: string, options: SendOptions) {
    if (!this.sesTransporter) {
      this.logger.warn(`Mailer Amazon SES transport is not configured to send mail.`);
      return null;
    }

    metrics.mail.counter('send_total').add(1, { name });
    try {
      const result = await this.sesTransporter.sendMail({
        from: this.config.mailer.SES.sender,
        ...options,
      });

      if (result.rejected && result.rejected.length > 0) {
        metrics.mail.counter('rejected_total').add(1, { name });
        this.logger.error(
          `Mail [${name}] rejected with response: ${result.response}`
        );
        return false;
      }

      metrics.mail.counter('accepted_total').add(1, { name });
      this.logger.log(`Mail [${name}] sent successfully.`);
      return true;
    } catch (e) {
      metrics.mail.counter('failed_total').add(1, { name });
      this.logger.error(`Failed to send mail [${name}].`, e);
      return false;
    }
  }
}

