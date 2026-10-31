import { Module } from '@nestjs/common';
import { PermissionModule } from '../permission';
import { UserModule } from '../user';
import { ServerConfigModule } from '../config';
import { BrightloopService } from './brightloop.service';
import { BrightloopController } from './brightloop.controller';
import { BrightloopBillingJob } from './brightloop-billing.job';

@Module({
  imports: [PermissionModule, UserModule, ServerConfigModule],
  providers: [BrightloopService, BrightloopBillingJob],
  controllers: [BrightloopController],
  exports: [BrightloopService],
})
export class BrightloopModule {}
