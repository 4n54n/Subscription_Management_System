import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProvider,
} from '@ai-sdk/google';
import {
  AISDKError,
  generateObject,
  generateText,
  JSONParseError,
  streamText,
} from 'ai';

import { Inject, Optional } from '@nestjs/common';
import { get } from 'lodash-es';
import { AiModelFallbackService } from '../../../core/config/model-fallback.service';
import {
  CopilotPromptInvalid,
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { CopilotProvider } from './provider';
import {
  CopilotCapability,
  CopilotChatOptions,
  CopilotProviderType,
  CopilotTextToTextProvider,
  PromptMessage,
} from './types';
import { chatToGPTMessage } from './utils';

export const DEFAULT_DIMENSIONS = 256;

export type GeminiConfig = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
};

function extractJsonObjects(buffer: string): { objects: any[]; remaining: string } {
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
            // Ignore parse errors
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

function formatGeminiRestPayload(messages: PromptMessage[], isWebSearch: boolean) {
  let systemText = '';
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemText += (systemText ? '\n\n' : '') + (m.content || '');
    } else {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const text = m.content || '';

      const last = contents[contents.length - 1];
      if (last && last.role === role) {
        last.parts[0].text += '\n\n' + text;
      } else {
        contents.push({
          role,
          parts: [{ text }],
        });
      }
    }
  }

  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  const payload: any = { contents };

  if (isWebSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  if (systemText.trim()) {
    payload.systemInstruction = {
      parts: [{ text: systemText.trim() }],
    };
  }

  return payload;
}

export class GeminiProvider
  extends CopilotProvider<GeminiConfig>
  implements CopilotTextToTextProvider
{
  @Inject()
  @Optional()
  protected readonly fallbackService?: AiModelFallbackService;

  override readonly type = CopilotProviderType.Gemini;
  override readonly capabilities = [CopilotCapability.TextToText];
  override readonly models = [
    // text to text
    'gemini-3.5-flash',
    'gemini-3.5-pro',
    'gemini-3.0-pro',
    'gemini-3.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-2.0-pro-exp-02-05',
    // embeddings
    'text-embedding-004',
  ];

  override configured(): boolean {
    return true;
  }

  override isModelAvailable(model: string): boolean {
    if (!model) return true;
    if (this.models.includes(model)) return true;
    if (
      model.toLowerCase().includes('gemini') ||
      model.toLowerCase().includes('gpt') ||
      model.toLowerCase().includes('claude') ||
      model.toLowerCase().includes('copilot')
    ) {
      return true;
    }
    return false;
  }

  protected override setup() {
    super.setup();
  }

  protected async checkParams({
    messages,
    embeddings,
    model,
  }: {
    messages?: PromptMessage[];
    embeddings?: string[];
    model?: string;
  }) {
    if (
      (messages && !messages.length) ||
      (embeddings && !embeddings.length) ||
      (model && !this.isModelAvailable(model))
    ) {
      throw new CopilotPromptInvalid();
    }
  }

  private handleError(e: any): Error {
    if (e instanceof AISDKError) {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: e.name,
        message: e.message,
      });
    }

    if (e instanceof UserFriendlyError) {
      return e;
    }

    if (e?.status === 429) {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'rate_limit',
        message: 'Google Gemini API rate limit exceeded. Please wait a moment and try again.',
      });
    }

    if (e instanceof Error) {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e.message,
      });
    } else {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e?.message || 'Unexpected google response',
      });
    }
  }

  private getApiKey(): string {
    return (
      this.fallbackService?.getApiKey() ||
      this.config?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      ''
    );
  }

  private getGoogleInstance(): GoogleGenerativeAIProvider {
    const apiKey = this.getApiKey();
    return createGoogleGenerativeAI({
      apiKey,
      baseURL: this.config?.baseUrl,
    });
  }

  private resolveGeminiModel(model?: string, featureName?: string): string {
    const dbOverrides = this.fallbackService?.getDbOverrides?.();
    const config = (globalThis as any)?.env?.config || this.AFFiNEConfig;

    const isProject = featureName === 'copilot_pill' || featureName === 'project';

    if (isProject) {
      // 1. Workspace & Project Management Copilot Model
      const projectModel =
        get(dbOverrides, 'copilot.providers.gemini.model') ||
        get(config, 'copilot.providers.gemini.model');
      if (projectModel && typeof projectModel === 'string') {
        const clean = projectModel.replace(/^models\//i, '').trim();
        if (clean) return clean;
      }
    } else {
      // 2. Research & Document Canvas Copilot Model (Document Canvas AI, Writing Assistant, Proposals & Doc Sidebar)
      const docModel =
        get(dbOverrides, 'copilot.researchDocModel') ||
        get(config, 'copilot.researchDocModel');
      if (docModel && typeof docModel === 'string') {
        const clean = docModel.replace(/^models\//i, '').trim();
        if (clean) return clean;
      }
    }

    // 3. If explicit model provided
    if (model && typeof model === 'string') {
      const clean = model.replace(/^models\//i, '').trim();
      if (clean) return clean;
    }

    const envModel = process.env.GEMINI_MODEL;
    if (envModel && typeof envModel === 'string') {
      const clean = envModel.replace(/^models\//i, '').trim();
      if (clean) return clean;
    }

    return isProject ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash';
  }

  // ====== text to text ======
  async generateText(
    messages: PromptMessage[],
    model?: string,
    options: CopilotChatOptions = {}
  ): Promise<string> {
    const isProject = Boolean((options as any)?.isProjectCopilot || (options as any)?.feature === 'project' || (options as any)?.feature === 'copilot_pill');
    const featureName = isProject ? 'copilot_pill' : 'doc_sidebar';
    const primaryModel = this.resolveGeminiModel(model, featureName);

    if (!this.fallbackService) {
      return this.directGenerateText(messages, primaryModel, options);
    }

    const { result, workingModel } = await this.fallbackService.executeWithFallback({
      feature: featureName,
      primaryModel,
      runner: (candidateModel) => this.directGenerateText(messages, candidateModel, options),
    });

    this.logger.log(`[Copilot ${featureName}] Working model: ${workingModel}`);
    return result;
  }



  private async directGenerateText(
    messages: PromptMessage[],
    model?: string,
    options: CopilotChatOptions = {}
  ): Promise<string> {
    const isProject = Boolean((options as any)?.isProjectCopilot || (options as any)?.feature === 'project' || (options as any)?.feature === 'copilot_pill');
    const featureName = isProject ? 'copilot_pill' : 'doc_sidebar';
    const effectiveModel = model ? model.replace(/^models\//i, '').trim() : this.resolveGeminiModel(model, featureName);
    await this.checkParams({ messages, model: effectiveModel });

    const isWebSearch = Boolean(
      (options as any)?.webSearch ||
      (options as any)?.googleSearch ||
      (options as any)?.networkSearch ||
      (options as any)?.params?.webSearch ||
      (options as any)?.params?.googleSearch ||
      (options as any)?.params?.networkSearch ||
      (options as any)?.promptName?.toLowerCase().includes('search') ||
      (options as any)?.promptName === 'Search With IntoAI'
    );

    const apiKey = this.getApiKey();

    if (isWebSearch && apiKey) {
      try {
        metrics.ai.counter('chat_text_calls').add(1, { model: effectiveModel });
        const requestBody = formatGeminiRestPayload(messages, isWebSearch);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: options.signal,
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`Gemini Search Grounding error: ${response.status} ${errText}`);
          throw new Error(`Google API ${response.status}: ${errText}`);
        }

        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } catch (e: any) {
        metrics.ai.counter('chat_text_errors').add(1, { model: effectiveModel });
        throw this.handleError(e);
      }
    }

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model: effectiveModel });

      let [system, msgs, schema] = await chatToGPTMessage(messages);
      const google = this.getGoogleInstance();
      const modelInstance = google(effectiveModel, {
        structuredOutputs: Boolean(options.jsonMode),
      });
      const { text } = schema
        ? await generateObject({
            model: modelInstance,
            system,
            messages: msgs,
            schema,
            abortSignal: options.signal,
            experimental_repairText: async ({ text, error }) => {
              if (error instanceof JSONParseError) {
                const ret = text.replaceAll(/^ny\n/g, ' ').trim();
                if (ret.startsWith('```') || ret.endsWith('```')) {
                  return ret
                    .replace(/```[\w\s]+\n/g, '')
                    .replace(/\n```/g, '')
                    .trim();
                }
                return ret;
              }
              return null;
            },
          }).then(r => ({ text: JSON.stringify(r.object) }))
        : await generateText({
            model: modelInstance,
            system,
            messages: msgs,
            abortSignal: options.signal,
          });

      if (!text) throw new Error('Failed to generate text');
      return text.trim();
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes('input image') || e?.message?.toLowerCase().includes('image')) {
        this.logger.warn('Gemini image processing failed, retrying in text-only mode...', e);
        try {
          const [system, msgs] = await chatToGPTMessage(messages, false);
          const google = this.getGoogleInstance();
          const modelInstance = google(effectiveModel);
          const { text } = await generateText({
            model: modelInstance,
            system,
            messages: msgs,
            abortSignal: options.signal,
          });
          if (text) return text.trim();
        } catch {
          // Proceed to throw original error below if fallback also fails
        }
      }
      metrics.ai.counter('chat_text_errors').add(1, { model: effectiveModel });
      throw this.handleError(e);
    }
  }

  async *generateTextStream(
    messages: PromptMessage[],
    model?: string,
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    const isProject = Boolean((options as any)?.isProjectCopilot || (options as any)?.feature === 'project' || (options as any)?.feature === 'copilot_pill');
    const featureName = isProject ? 'copilot_pill' : 'doc_sidebar';
    const primaryModel = this.resolveGeminiModel(model, featureName);

    if (!this.fallbackService) {
      yield* this.directGenerateTextStream(messages, primaryModel, options);
      return;
    }

    const generator = this.fallbackService.executeStreamWithFallback({
      feature: featureName,
      primaryModel,
      streamRunner: (candidateModel) =>
        this.directGenerateTextStream(messages, candidateModel, options),
    });

    for await (const item of generator) {
      yield item.chunk;
    }
  }

  private async *directGenerateTextStream(
    messages: PromptMessage[],
    model?: string,
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    const isProject = Boolean((options as any)?.isProjectCopilot || (options as any)?.feature === 'project' || (options as any)?.feature === 'copilot_pill');
    const featureName = isProject ? 'copilot_pill' : 'doc_sidebar';
    const effectiveModel = model ? model.replace(/^models\//i, '').trim() : this.resolveGeminiModel(model, featureName);
    await this.checkParams({ messages, model: effectiveModel });

    const isWebSearch = Boolean(
      (options as any)?.webSearch ||
      (options as any)?.googleSearch ||
      (options as any)?.networkSearch ||
      (options as any)?.params?.webSearch ||
      (options as any)?.params?.googleSearch ||
      (options as any)?.params?.networkSearch ||
      (options as any)?.promptName?.toLowerCase().includes('search') ||
      (options as any)?.promptName === 'Search With IntoAI'
    );

    const apiKey = this.getApiKey();

    if (isWebSearch && apiKey) {
      try {
        metrics.ai.counter('chat_text_stream_calls').add(1, { model: effectiveModel });
        const requestBody = formatGeminiRestPayload(messages, isWebSearch);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:streamGenerateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: options.signal,
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`Gemini Search Grounding stream error: ${response.status} ${errText}`);
          throw new Error(`Google API ${response.status}: ${errText}`);
        }

        if (response.body) {
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
          const reader = typeof (response.body as any).getReader === 'function'
            ? (response.body as any).getReader()
            : null;

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const { objects, remaining } = extractJsonObjects(buffer);
              buffer = remaining;
              for (const obj of objects) {
                const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                  yield chunkText;
                }
              }
            }
            if (buffer.trim()) {
              const { objects } = extractJsonObjects(buffer);
              for (const obj of objects) {
                const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                  yield chunkText;
                }
              }
            }
            return;
          } else {
            for await (const chunk of response.body as any) {
              buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
              const { objects, remaining } = extractJsonObjects(buffer);
              buffer = remaining;
              for (const obj of objects) {
                const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                  yield chunkText;
                }
              }
            }
            return;
          }
        }
      } catch (e: any) {
        metrics.ai.counter('chat_text_stream_errors').add(1, { model: effectiveModel });
        throw this.handleError(e);
      }
    }

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model: effectiveModel });
      let [system, msgs] = await chatToGPTMessage(messages);

      const google = this.getGoogleInstance();
      const modelInstance = google(effectiveModel);

      const { textStream } = streamText({
        model: modelInstance,
        system,
        messages: msgs,
        abortSignal: options.signal,
      });

      for await (const chunk of textStream) {
        yield chunk;
      }
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes('input image') || e?.message?.toLowerCase().includes('image')) {
        this.logger.warn('Gemini image stream processing failed, retrying in text-only mode...', e);
        try {
          const [system, msgs] = await chatToGPTMessage(messages, false);
          const google = this.getGoogleInstance();
          const { textStream } = streamText({
            model: google(effectiveModel),
            system,
            messages: msgs,
            abortSignal: options.signal,
          });

          for await (const chunk of textStream) {
            yield chunk;
          }
          return;
        } catch {
          // Proceed to throw original error below if fallback fails
        }
      }
      metrics.ai.counter('chat_text_stream_errors').add(1, { model: effectiveModel });
      throw this.handleError(e);
    }
  }
}
