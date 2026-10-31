import './config';

import { Module } from '@nestjs/common';

import { AiModelFallbackService } from './model-fallback.service';
import {
  AppConfigResolver,
  ServerConfigResolver,
  ServerFeatureConfigResolver,
} from './resolver';
import { ServerService } from './service';

@Module({
  providers: [ServerService, AiModelFallbackService],
  exports: [ServerService, AiModelFallbackService],
})
export class ServerConfigModule {}
@Module({
  imports: [ServerConfigModule],
  providers: [
    ServerConfigResolver,
    ServerFeatureConfigResolver,
    AppConfigResolver,
  ],
})
export class ServerConfigResolverModule {}
export { ServerService, AiModelFallbackService };
export { ServerFeature } from './types';
