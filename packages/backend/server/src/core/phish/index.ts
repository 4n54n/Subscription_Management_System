import { Module } from '@nestjs/common';
import { MailModule } from '../mail';
import { ServerConfigModule } from '../config';
import { PhishResolver } from './resolver';
import { PhishService } from './phish.service';

export * from './config';
export * from './phish.service';
export * from './resolver';

@Module({
  imports: [MailModule, ServerConfigModule],
  providers: [PhishService, PhishResolver],
  exports: [PhishService],
})
export class PhishModule {}
