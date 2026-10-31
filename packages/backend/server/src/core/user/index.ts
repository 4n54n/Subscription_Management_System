import { Module } from '@nestjs/common';

import { ServerConfigModule } from '../config';
import { MailModule } from '../mail';
import { PermissionModule } from '../permission';
import { QuotaModule } from '../quota';
import { StorageModule } from '../storage';
import { UserAvatarController } from './controller';
import {
  UserManagementResolver,
  UserResolver,
  UserSettingsResolver,
} from './resolver';

@Module({
  imports: [
    StorageModule,
    PermissionModule,
    MailModule,
    QuotaModule,
    ServerConfigModule,
  ],
  providers: [UserResolver, UserManagementResolver, UserSettingsResolver],
  controllers: [UserAvatarController],
})
export class UserModule {}

export { PublicUserType, UserType, WorkspaceUserType } from './types';
