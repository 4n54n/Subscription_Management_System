import { create, createEsmHooks } from 'ts-node';

const service = create({
  experimentalSpecifierResolution: 'node',
  transpileOnly: true,
  logError: true,
  project: './tsconfig.dev.json',
});
const hooks = createEsmHooks(service);

export const resolve = hooks.resolve;
export const load = hooks.load;
