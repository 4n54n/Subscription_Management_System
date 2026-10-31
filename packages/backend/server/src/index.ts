/// <reference types="./global.d.ts" />
import './prelude';

import { Logger } from '@nestjs/common';

import { createApp } from './app';
import { Config, URLHelper } from './base';

const app = await createApp();
const config = app.get(Config);
const url = app.get(URLHelper);
const listeningHost = '0.0.0.0';

await app.listen(config.server.port, listeningHost);

const logger = new Logger('App');

logger.log(`AFFiNE Server is running in [${env.DEPLOYMENT_TYPE}] mode`);
logger.log(`Listening on http://${listeningHost}:${config.server.port}`);
logger.log(`And the public server should be recognized as ${url.home}`);
