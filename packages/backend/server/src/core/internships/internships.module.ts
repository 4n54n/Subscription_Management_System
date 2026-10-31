import { Module } from '@nestjs/common';
import { InternshipsService } from './internships.service';
import { InternshipsController } from './internships.controller';
import { PermissionModule } from '../permission';
import { MailModule } from '../mail';
import { ServerConfigModule } from '../config';

@Module({
  imports: [PermissionModule, MailModule, ServerConfigModule],
  controllers: [InternshipsController],
  providers: [InternshipsService],
  exports: [InternshipsService],
})
export class InternshipsModule {}

