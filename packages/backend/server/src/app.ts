import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

import {
  AFFiNELogger,
  CacheInterceptor,
  CloudThrottlerGuard,
  Config,
  GlobalExceptionFilter,
} from './base';
import { SocketIoAdapter } from './base/websocket';
import { AuthGuard } from './core/auth';
import { GuestPresentationGuard } from './core/presentation';
import { serverTimingAndCache } from './middleware/timing';

const OneMB = 1024 * 1024;

export async function createApp() {
  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    rawBody: true,
    bodyParser: true,
    bufferLogs: true,
  });

  app.useBodyParser('json', { limit: 50 * OneMB });
  app.useBodyParser('urlencoded', { limit: 50 * OneMB, extended: true });
  app.useBodyParser('raw', { limit: 100 * OneMB });

  app.useLogger(app.get(AFFiNELogger));
  const config = app.get(Config);

  if (config.server.path) {
    app.setGlobalPrefix(config.server.path);
  }

  app.use(serverTimingAndCache);

  app.use(
    graphqlUploadExpress({
      maxFieldSize: 50 * OneMB,
      maxFileSize: 100 * OneMB,
      maxFiles: 32,
    })
  );

  app.useGlobalGuards(
    app.get(AuthGuard),
    app.get(GuestPresentationGuard),
    app.get(CloudThrottlerGuard)
  );
  app.useGlobalInterceptors(app.get(CacheInterceptor));
  app.useGlobalFilters(new GlobalExceptionFilter(app.getHttpAdapter()));
  app.use(cookieParser());
  // only enable shutdown hooks in production
  // https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown
  if (env.prod) {
    app.enableShutdownHooks();
  }

  const adapter = new SocketIoAdapter(app);
  app.useWebSocketAdapter(adapter);

  return app;
}
