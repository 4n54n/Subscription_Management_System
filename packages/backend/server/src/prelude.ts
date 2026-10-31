import 'reflect-metadata';
import './env';

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const CUSTOM_CONFIG_PATH = `${homedir()}/.affine/config`;

function loadPrivateKey() {
  const file = join(CUSTOM_CONFIG_PATH, 'private.key');
  if (!process.env.AFFINE_PRIVATE_KEY && existsSync(file)) {
    const privateKey = readFileSync(file, 'utf-8');
    process.env.AFFINE_PRIVATE_KEY = privateKey;
  }
}

function load() {
  let isPrivateKeyFromEnv = !!process.env.AFFINE_PRIVATE_KEY;
  
  // Safe ESM __dirname calculation
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
  const envPaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '../../.env'),
    join(currentDir, '../../../../.env'),
    join(currentDir, '../../../.env'),
    join(CUSTOM_CONFIG_PATH, '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      config({ path: envPath, override: true });
    }
  }

  // The old AFFINE_PRIVATE_KEY in old .env is somehow not working,
  // we should ignore it
  if (!isPrivateKeyFromEnv) {
    delete process.env.AFFINE_PRIVATE_KEY;
  }

  // 2. load `config/private.key` to patch app configs
  loadPrivateKey();
}

load();
