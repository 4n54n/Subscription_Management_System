import {
  CoreAssistantMessage,
  CoreUserMessage,
  FilePart,
  ImagePart,
  TextPart,
} from 'ai';

import { PromptMessage } from './types';

type ChatMessage = CoreUserMessage | CoreAssistantMessage;

export const SIMPLE_IMAGE_URL_REGEX = /^(https?:\/\/|data:image\/)/;
const FORMAT_INFER_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/aac',
  flac: 'audio/flac',
  ogv: 'video/ogg',
  wav: 'audio/wav',
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  md: 'text/plain',
  mov: 'video/mov',
  mpeg: 'video/mpeg',
  mp4: 'video/mp4',
  avi: 'video/avi',
  wmv: 'video/wmv',
  flv: 'video/flv',
};

async function inferMimeType(url: string) {
  if (url.startsWith('data:')) {
    return url.split(';')[0].split(':')[1];
  }
  const pathname = new URL(url).pathname;
  const extension = pathname.split('.').pop();
  if (extension) {
    const ext = FORMAT_INFER_MAP[extension];
    if (ext) {
      return ext;
    }
    const mimeType = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    }).then(res => res.headers.get('Content-Type'));
    if (mimeType) {
      return mimeType;
    }
  }
  return 'application/octet-stream';
}

export async function chatToGPTMessage(
  messages: PromptMessage[],
  // TODO(@darkskygit): move this logic in interface refactoring
  withAttachment: boolean = true
): Promise<[string | undefined, ChatMessage[], any]> {
  const system = messages[0]?.role === 'system' ? messages.shift() : undefined;
  const schema = system?.params?.schema;

  // filter redundant fields
  const msgs: ChatMessage[] = [];
  for (let { role, content, attachments, params } of messages.filter(
    m => m.role !== 'system'
  )) {
    content = content.trim();
    role = role as 'user' | 'assistant';
    const mimetype = params?.mimetype;
    if (Array.isArray(attachments) && attachments.length > 0) {
      const contents: (TextPart | ImagePart | FilePart)[] = [];
      let userText = content;

      if (withAttachment) {
        for (let item of attachments) {
          let attachmentUrlOrString: string =
            typeof item === 'string'
              ? item
              : (item as any)?.attachment || (item as any)?.url || '';
          let mimeType: string =
            typeof item === 'object'
              ? (item as any)?.mimeType || (item as any)?.type || ''
              : typeof mimetype === 'string'
              ? mimetype
              : '';

          if (typeof item === 'string') {
            if (item.startsWith('data:')) {
              const match = item.match(/^data:([^;]+);/);
              if (match) mimeType = match[1];
            } else {
              const inferred = await inferMimeType(item);
              if (inferred && inferred !== 'application/octet-stream') {
                mimeType = inferred;
              }
            }
          }

          const isImage =
            mimeType.startsWith('image/') ||
            attachmentUrlOrString.startsWith('data:image/');

          if (isImage) {
            let imagePayload: Buffer | URL | string = attachmentUrlOrString;
            const finalMime =
              mimeType ||
              (attachmentUrlOrString.match(/^data:(image\/[a-zA-Z0-9+-]+);/)?.[1] ??
                'image/png');

            if (attachmentUrlOrString.startsWith('data:')) {
              try {
                const parts = attachmentUrlOrString.split(',');
                if (parts[1]) {
                  imagePayload = Buffer.from(parts[1], 'base64');
                }
              } catch {
                // Fallback
              }
            }
            contents.push({
              type: 'image',
              image: imagePayload,
              mimeType: finalMime,
            });
          } else {
            // Text / Document / Code / File attachment
            let fileText = '';
            if (attachmentUrlOrString.startsWith('data:')) {
              try {
                const parts = attachmentUrlOrString.split(',');
                if (parts[1]) {
                  fileText = Buffer.from(parts[1], 'base64').toString('utf-8');
                }
              } catch {
                fileText = attachmentUrlOrString;
              }
            } else {
              fileText = attachmentUrlOrString;
            }

            if (fileText.trim()) {
              userText += `\n\n[Uploaded File Attachment (${mimeType || 'file'})]:\n${fileText.trim()}\n`;
            }
          }
        }
      }

      if (userText.trim()) {
        contents.unshift({ type: 'text', text: userText.trim() });
      } else if (!contents.length) {
        contents.push({ type: 'text', text: '[no content]' });
      }

      msgs.push({ role, content: contents } as ChatMessage);
    } else {
      msgs.push({ role, content });
    }
  }

  return [system?.content, msgs, schema];
}

export class CitationParser {
  private readonly SQUARE_BRACKET_OPEN = '[';

  private readonly SQUARE_BRACKET_CLOSE = ']';

  private readonly PARENTHESES_OPEN = '(';

  private startToken: string[] = [];

  private endToken: string[] = [];

  private numberToken: string[] = [];

  private citations: string[] = [];

  public parse(content: string, citations: string[]) {
    this.citations = citations;
    let result = '';
    const contentArray = content.split('');
    for (const [index, char] of contentArray.entries()) {
      if (char === this.SQUARE_BRACKET_OPEN) {
        if (this.numberToken.length === 0) {
          this.startToken.push(char);
        } else {
          result += this.flush() + char;
        }
        continue;
      }

      if (char === this.SQUARE_BRACKET_CLOSE) {
        this.endToken.push(char);
        if (this.startToken.length === this.endToken.length) {
          const cIndex = Number(this.numberToken.join('').trim());
          if (
            cIndex > 0 &&
            cIndex <= citations.length &&
            contentArray[index + 1] !== this.PARENTHESES_OPEN
          ) {
            const content = `[^${cIndex}]`;
            result += content;
            this.resetToken();
          } else {
            result += this.flush();
          }
        } else if (this.startToken.length < this.endToken.length) {
          result += this.flush();
        }
        continue;
      }

      if (this.isNumeric(char)) {
        if (this.startToken.length > 0) {
          this.numberToken.push(char);
        } else {
          result += this.flush() + char;
        }
        continue;
      }

      if (this.startToken.length > 0) {
        result += this.flush() + char;
      } else {
        result += char;
      }
    }

    return result;
  }

  public end() {
    return this.flush() + '\n' + this.getFootnotes();
  }

  private flush() {
    const content = this.getTokenContent();
    this.resetToken();
    return content;
  }

  private getFootnotes() {
    const footnotes = this.citations.map((citation, index) => {
      return `[^${index + 1}]: {"type":"url","url":"${encodeURIComponent(
        citation
      )}"}`;
    });
    return footnotes.join('\n');
  }

  private getTokenContent() {
    return this.startToken.concat(this.numberToken, this.endToken).join('');
  }

  private resetToken() {
    this.startToken = [];
    this.endToken = [];
    this.numberToken = [];
  }

  private isNumeric(str: string) {
    return !isNaN(Number(str)) && str.trim() !== '';
  }
}
