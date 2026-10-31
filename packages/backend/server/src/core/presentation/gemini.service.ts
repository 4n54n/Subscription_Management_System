import { Injectable, Logger, Optional } from '@nestjs/common';
import { ServerService, AiModelFallbackService } from '../config';

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

// Simple in-memory history: roomId+sessionId → messages
// Cleared when room ends (via clearRoom)
const histories = new Map<string, GeminiMessage[]>();

@Injectable()
export class GeminiProxyService {
  private readonly logger = new Logger(GeminiProxyService.name);
  private readonly apiKey: string;

  constructor(
    @Optional() private readonly serverService?: ServerService,
    @Optional() private readonly fallbackService?: AiModelFallbackService
  ) {
    this.apiKey =
      process.env['GEMINI_API_KEY'] ??
      process.env['GOOGLE_GEMINI_API_KEY'] ??
      '';
    if (!this.apiKey && !this.serverService?.getConfig()?.copilot?.providers?.gemini?.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY or Admin AI config key not set. Presentation Gemini chat will require an API key.'
      );
    }
  }

  private getApiKey(customApiKey?: string): string {
    const liveKey = this.fallbackService?.getApiKey(customApiKey);
    if (liveKey) return liveKey;
    const dbOverrides = this.serverService?.getDbOverrides();
    const dbKey = (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey;
    const globalKey = this.serverService?.getConfig()?.copilot?.providers?.gemini?.apiKey;
    return (
      customApiKey ||
      dbKey ||
      globalKey ||
      this.apiKey ||
      process.env['GEMINI_API_KEY'] ||
      process.env['GOOGLE_GEMINI_API_KEY'] ||
      ''
    );
  }

  private historyKey(roomId: string, sessionId: string) {
    return `${roomId}:${sessionId}`;
  }

  getHistory(roomId: string, sessionId: string): GeminiMessage[] {
    return histories.get(this.historyKey(roomId, sessionId)) ?? [];
  }

  async chat(
    roomId: string,
    sessionId: string,
    userMessage: string,
    modelName: string,
    customApiKey?: string,
    limitOutput?: boolean
  ): Promise<string> {
    const cleanModel = (modelName || 'gemini-2.5-flash').replace(/^models\//i, '').trim();

    if (!this.fallbackService) {
      return this.directChat(roomId, sessionId, userMessage, cleanModel, customApiKey, limitOutput);
    }

    try {
      const { result, workingModel } = await this.fallbackService.executeWithFallback({
        feature: 'meeting',
        primaryModel: cleanModel,
        customApiKey,
        runner: async (candidateModel) => {
          const res = await this.directChat(roomId, sessionId, userMessage, candidateModel, customApiKey, limitOutput);
          if (res.startsWith('AI Service Error:')) {
            throw new Error(res);
          }
          return res;
        },
      });

      this.logger.log(`[Meeting AI] Working model: ${workingModel}`);
      return result;
    } catch (e: any) {
      return `AI Service Error: ${e?.message || 'Execution failed'}`;
    }
  }

  private async directChat(
    roomId: string,
    sessionId: string,
    userMessage: string,
    modelName: string,
    customApiKey?: string,
    limitOutput?: boolean
  ): Promise<string> {
    const keyToUse = this.getApiKey(customApiKey);
    if (!keyToUse) {
      return 'Gemini API key is not configured. Please set your API key in Admin AI settings (/admin/ai).';
    }

    const key = this.historyKey(roomId, sessionId);
    const history = histories.get(key) ?? [];

    // Build contents array for Gemini REST API
    const contents = [
      ...history.map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const cleanModelName = modelName.startsWith('models/')
      ? modelName.substring(7)
      : modelName;

    const requestBody: any = { contents };
    if (limitOutput) {
      requestBody.generationConfig = {
        maxOutputTokens: 250,
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${keyToUse}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.error(`Gemini API error: ${response.status} ${errBody}`);
        try {
          const parsed = JSON.parse(errBody);
          if (parsed?.error?.message) {
            return `AI Service Error: ${parsed.error.message}`;
          }
        } catch (_) {}
        return `AI Service Error: HTTP ${response.status} - ${errBody || 'Unknown error'}`;
      }

      const data = (await response.json()) as any;
      const reply: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        'No response from AI.';

      // Update history
      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'model', content: reply });
      histories.set(key, history);

      return reply;
    } catch (e) {
      this.logger.error('Gemini fetch error', e);
      return `AI Service Error: ${(e as Error)?.message || 'fetch failed'}`;
    }
  }

  async *chatStream(
    roomId: string,
    sessionId: string,
    userMessage: string,
    modelName: string,
    customApiKey?: string,
    limitOutput?: boolean
  ): AsyncGenerator<string, void, unknown> {
    if (!this.fallbackService) {
      yield* this.directChatStream(roomId, sessionId, userMessage, modelName, customApiKey, limitOutput);
      return;
    }

    try {
      const generator = this.fallbackService.executeStreamWithFallback({
        feature: 'meeting',
        primaryModel: modelName,
        customApiKey,
        streamRunner: (candidateModel) =>
          this.directChatStream(roomId, sessionId, userMessage, candidateModel, customApiKey, limitOutput),
      });

      for await (const item of generator) {
        yield item.chunk;
      }
    } catch (e: any) {
      yield `AI Service Error: ${e?.message || 'Stream failed'}`;
    }
  }

  private async *directChatStream(
    roomId: string,
    sessionId: string,
    userMessage: string,
    modelName: string,
    customApiKey?: string,
    limitOutput?: boolean
  ): AsyncGenerator<string, void, unknown> {
    const keyToUse = this.getApiKey(customApiKey);
    if (!keyToUse) {
      yield 'Gemini API key is not configured. Please set your API key in Admin AI settings (/admin/ai).';
      return;
    }

    const key = this.historyKey(roomId, sessionId);
    const history = histories.get(key) ?? [];

    const contents = [
      ...history.map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const cleanModelName = modelName.startsWith('models/')
      ? modelName.substring(7)
      : modelName;

    const requestBody: any = { contents };
    if (limitOutput) {
      requestBody.generationConfig = {
        maxOutputTokens: 250,
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:streamGenerateContent?key=${keyToUse}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.error(
          `Gemini API stream error: ${response.status} ${errBody}`
        );
        let message = `AI Service Error: HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errBody);
          if (parsed?.error?.message) {
            message = `AI Service Error: ${parsed.error.message}`;
          }
        } catch (_) {}
        yield message;
        return;
      }

      if (!response.body) {
        yield 'AI Service Error: Empty response stream';
        return;
      }

      let fullReply = '';
      const reader =
        typeof (response.body as any).getReader === 'function'
          ? (response.body as any).getReader()
          : null;

      if (reader) {
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { objects, remaining } = extractJsonObjects(buffer);
          buffer = remaining;

          for (const obj of objects) {
            const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
              fullReply += chunkText;
              yield chunkText;
            }
          }
        }

        if (buffer.trim()) {
          const { objects } = extractJsonObjects(buffer);
          for (const obj of objects) {
            const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
              fullReply += chunkText;
              yield chunkText;
            }
          }
        }
      } else {
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        for await (const chunk of response.body as any) {
          buffer +=
            typeof chunk === 'string'
              ? chunk
              : decoder.decode(chunk, { stream: true });
          const { objects, remaining } = extractJsonObjects(buffer);
          buffer = remaining;

          for (const obj of objects) {
            const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
              fullReply += chunkText;
              yield chunkText;
            }
          }
        }

        if (buffer.trim()) {
          const { objects } = extractJsonObjects(buffer);
          for (const obj of objects) {
            const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
              fullReply += chunkText;
              yield chunkText;
            }
          }
        }
      }

      if (!fullReply) {
        yield 'No response from AI.';
        return;
      }

      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'model', content: fullReply });
      histories.set(key, history);
    } catch (e) {
      this.logger.error('Gemini stream fetch error', e);
      yield `AI Service Error: ${(e as Error)?.message || 'fetch failed'}`;
    }
  }

  clearRoom(roomId: string) {
    // Remove all history entries for the given room
    for (const key of Array.from(histories.keys())) {
      if (key.startsWith(`${roomId}:`)) {
        histories.delete(key);
      }
    }
    this.logger.log(`Cleared Gemini history for room ${roomId}`);
  }

  async listModels(
    customApiKey?: string
  ): Promise<Array<{ name: string; displayName: string }>> {
    const key = (customApiKey && customApiKey.trim()) || this.getApiKey();
    const fallbackModels = [
      { name: 'gemini-3.5-flash', displayName: 'Gemini 3.5 Flash' },
      { name: 'gemini-3.5-pro', displayName: 'Gemini 3.5 Pro' },
      { name: 'gemini-3.0-pro', displayName: 'Gemini 3.0 Pro' },
      { name: 'gemini-3.0-flash', displayName: 'Gemini 3.0 Flash' },
      { name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
      { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
      { name: 'gemini-2.0-pro-exp-02-05', displayName: 'Gemini 2.0 Pro (Experimental)' },
      { name: 'gemini-2.0-flash-thinking-exp-01-21', displayName: 'Gemini 2.0 Flash Thinking' },
      { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
      { name: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash-Lite' },
      { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
      { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
      { name: 'gemini-1.5-flash-8b', displayName: 'Gemini 1.5 Flash 8B' },
    ];

    if (!key) {
      return fallbackModels;
    }

    // Keywords that indicate non-text-generation models (image / audio / video / embedding)
    const EXCLUDED_KEYWORDS = [
      'image',
      'vision',
      'audio',
      'video',
      'embedding',
      'imagen',
      'veo',
      'tts',
      'sonar',
      'gpt',
      'claude',
      'gemini-1.0-pro',
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      if (!response.ok) {
        throw new Error(`Google API returned status ${response.status}`);
      }
      const data = (await response.json()) as any;
      if (data && Array.isArray(data.models)) {
        const filtered = data.models
          .filter((m: any) => {
            const nameLower = (m.name ?? '').toLowerCase();
            const methods: string[] = m.supportedGenerationMethods ?? [];

            // Must be a text-generation model
            if (!methods.includes('generateContent')) return false;

            // Exclude multimedia / embedding / specialty models by name keywords
            if (EXCLUDED_KEYWORDS.some(kw => nameLower.includes(kw)))
              return false;

            return true;
          })
          .map((m: any) => {
            const name = m.name.startsWith('models/')
              ? m.name.substring(7)
              : m.name;
            return {
              name,
              displayName: m.displayName || name,
            };
          });

        if (filtered.length > 0) return filtered;
      }
    } catch (e) {
      this.logger.error('Failed to fetch models from Google', e);
    }

    // Fallback when API is unreachable or returns no matching models
    return fallbackModels;
  }
}

function extractJsonObjects(buffer: string): {
  objects: any[];
  remaining: string;
} {
  const objects: any[] = [];
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let startIndex = -1;
  let lastIndex = 0;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) {
          startIndex = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          const jsonStr = buffer.slice(startIndex, i + 1);
          try {
            const obj = JSON.parse(jsonStr);
            objects.push(obj);
            lastIndex = i + 1;
          } catch (e) {
            // Ignore parse errors (might be invalid syntax)
          }
          startIndex = -1;
        }
      }
    }
  }

  return {
    objects,
    remaining: buffer.slice(lastIndex),
  };
}
