import { createRequire } from 'node:module';

// Dev stub: gracefully handle missing native Rust binary in local Windows development.
const nativeStub = {
  mergeUpdatesInApplyWay: (..._args: any[]) => new Uint8Array(),
  verifyChallengeResponse: (..._args: any[]) => Promise.resolve(true),
  mintChallengeResponse: (..._args: any[]) => Promise.resolve('stub-challenge'),
  getMime: (_path: string) => 'application/octet-stream',
  parseDoc: (..._args: any[]) => ({}),
  Tokenizer: class { encode(_text: string) { return []; } },
  fromModelName: (_name: string) => new nativeStub.Tokenizer(),
  htmlSanitize: (html: string) => html,
};

let serverNativeModule: typeof import('@affine/server-native');
try {
  serverNativeModule = await import('@affine/server-native');
} catch {
  try {
    const require = createRequire(import.meta.url);
    serverNativeModule =
      process.arch === 'arm64'
        ? require('../server-native.arm64.node')
        : process.arch === 'arm'
          ? require('../server-native.armv7.node')
          : require('../server-native.node');
  } catch {
    console.warn(
      '[IntoAI Dev] server-native Rust binary not found. Using dev stubs. This is expected in local Windows dev.'
    );
    serverNativeModule = nativeStub as any;
  }
}

export const mergeUpdatesInApplyWay = serverNativeModule.mergeUpdatesInApplyWay;

export const verifyChallengeResponse = async (
  response: any,
  bits: number,
  resource: string
) => {
  if (typeof response !== 'string' || !response || !resource) return false;
  return serverNativeModule.verifyChallengeResponse(response, bits, resource);
};

export const mintChallengeResponse = async (resource: string, bits: number) => {
  if (!resource) return null;
  return serverNativeModule.mintChallengeResponse(resource, bits);
};

export const getMime = serverNativeModule.getMime;
export const parseDoc = serverNativeModule.parseDoc;
export const Tokenizer = serverNativeModule.Tokenizer;
export const fromModelName = serverNativeModule.fromModelName;
export const htmlSanitize = serverNativeModule.htmlSanitize;
