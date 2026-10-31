import { Module } from '@nestjs/common';

import { ServerConfigModule } from '../config';
import { DocStorageModule } from '../doc';
import { PermissionModule } from '../permission';
import { DocRendererController } from './controller';

@Module({
  imports: [DocStorageModule, PermissionModule, ServerConfigModule],
  controllers: [DocRendererController],
})
export class DocRendererModule {}
