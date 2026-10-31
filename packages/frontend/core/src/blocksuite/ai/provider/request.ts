import { partition } from 'lodash-es';

import { AIProvider } from './ai-provider';
import type { CopilotClient } from './copilot-client';
import { delay, toTextStream } from './event-source';

const TIMEOUT = 50000;

export type TextToTextOptions = {
  client: CopilotClient;
  sessionId: string;
  content?: string;
  attachments?: (string | Blob | File)[];
  params?: Record<string, any>;
  timeout?: number;
  stream?: boolean;
  signal?: AbortSignal;
  retry?: boolean;
  workflow?: boolean;
  isRootSession?: boolean;
  postfix?: (text: string) => string;
};

export type ToImageOptions = TextToTextOptions & {
  seed?: string;
};

async function resizeImage(blob: Blob | File): Promise<Blob | null> {
  let src = '';
  try {
    src = URL.createObjectURL(blob);
    const img = new Image();
    img.src = src;
    await new Promise(resolve => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    // keep aspect ratio
    const scale = Math.min(1024 / img.width, 1024 / img.height);
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise(resolve =>
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8)
      );
    }
  } catch (e) {
    console.error(e);
  } finally {
    if (src) URL.revokeObjectURL(src);
  }
  return null;
}

async function resizeDataUrlImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const resizedBlob = await resizeImage(blob);
    if (!resizedBlob) return dataUrl;
    return await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(resizedBlob);
    });
  } catch {
    return dataUrl;
  }
}

interface CreateMessageOptions {
  client: CopilotClient;
  sessionId: string;
  content?: string;
  attachments?: (string | Blob | File)[];
  params?: Record<string, any>;
}

async function createMessage({
  client,
  sessionId,
  content,
  attachments,
  params,
}: CreateMessageOptions): Promise<string> {
  const hasAttachments = attachments && attachments.length > 0;
  const options: Parameters<CopilotClient['createMessage']>[0] = {
    sessionId,
    content,
    params,
  };

  if (hasAttachments) {
    const [stringAttachments, blobs] = partition(
      attachments,
      attachment => typeof attachment === 'string'
    ) as [string[], (Blob | File)[]];

    options.attachments = await Promise.all(
      stringAttachments.map(resizeDataUrlImage)
    );
    options.blobs = (
      await Promise.all(
        blobs.map(resizeImage).map(async blob => {
          const file = await blob;
          if (!file) return null;
          return new File([file], sessionId, {
            type: file.type,
          });
        })
      )
    ).filter(Boolean) as File[];
  }

  try {
    const msgId = await client.createMessage(options);
    return msgId;
  } catch (err: any) {
    console.error('[ASK_AI_DEBUG] [request.ts] createMessage failed:', err);
    if (
      String(err).includes('Presentation guests cannot access this resource') ||
      String(err?.message).includes('Presentation guests cannot access this resource')
    ) {
      return crypto.randomUUID();
    }
    throw err;
  }
}

export function textToText({
  client,
  sessionId,
  content,
  attachments,
  params,
  stream,
  signal,
  timeout = TIMEOUT,
  retry = false,
  workflow = false,
  postfix,
}: TextToTextOptions) {
  let messageId: string | undefined;

  if (stream) {
    return {
      [Symbol.asyncIterator]: async function* () {
        if (!retry) {
          messageId = await createMessage({
            client,
            sessionId,
            content,
            attachments,
            params,
          });
        }
        const eventSource = client.chatTextStream(
          {
            sessionId,
            messageId,
          },
          workflow ? 'workflow' : undefined
        );
        AIProvider.LAST_ACTION_SESSIONID = sessionId;

        if (signal) {
          if (signal.aborted) {
            eventSource.close();
            return;
          }
          signal.onabort = () => {
            eventSource.close();
          };
        }
        let yieldedCount = 0;
        try {
          if (postfix) {
            const messages: string[] = [];
            for await (const event of toTextStream(eventSource, {
              timeout,
              signal,
            })) {
              if (event.type === 'message') {
                yieldedCount++;
                messages.push(event.data);
              }
            }
            if (yieldedCount > 0) {
              yield postfix(messages.join(''));
            }
          } else {
            for await (const event of toTextStream(eventSource, {
              timeout,
              signal,
            })) {
              if (event.type === 'message') {
                yieldedCount++;
                yield event.data;
              }
            }
          }
        } catch (streamErr) {
          console.error('[ASK_AI_DEBUG] [request.ts] Error during toTextStream iteration:', streamErr);
        }

        if (yieldedCount === 0) {
          try {
            const fullText = await client.chatText({ sessionId, messageId, signal });
            if (fullText) {
              yield postfix ? postfix(fullText) : fullText;
            }
          } catch (fallbackErr) {
            console.error('[ASK_AI_DEBUG] [request.ts] HTTP chatText fallback failed:', fallbackErr);
            throw fallbackErr;
          }
        }
      },
    };
  } else {
    return Promise.race([
      timeout
        ? delay(timeout).then(() => {
            console.error('[ASK_AI_DEBUG] [request.ts] textToText non-stream TIMEOUT after', timeout, 'ms');
            throw new Error('Timeout');
          })
        : null,
      (async function () {
        if (!retry) {
          messageId = await createMessage({
            client,
            sessionId,
            content,
            attachments,
            params,
          });
        }
        AIProvider.LAST_ACTION_SESSIONID = sessionId;

        return client.chatText({
          sessionId,
          messageId,
        });
      })(),
    ]);
  }
}

// Only one image is currently being processed
export function toImage({
  content,
  sessionId,
  attachments,
  params,
  seed,
  signal,
  timeout = TIMEOUT,
  retry = false,
  workflow = false,
  client,
}: ToImageOptions) {
  let messageId: string | undefined;
  return {
    [Symbol.asyncIterator]: async function* () {
      if (!retry) {
        messageId = await createMessage({
          client,
          sessionId,
          content,
          attachments,
          params,
        });
      }
      const eventSource = client.imagesStream(
        sessionId,
        messageId,
        seed,
        workflow ? 'workflow' : undefined
      );
      AIProvider.LAST_ACTION_SESSIONID = sessionId;

      for await (const event of toTextStream(eventSource, {
        timeout,
        signal,
      })) {
        if (event.type === 'attachment') {
          yield event.data;
        }
      }
    },
  };
}
