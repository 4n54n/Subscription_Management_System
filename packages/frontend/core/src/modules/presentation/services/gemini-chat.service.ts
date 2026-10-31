import { LiveData, Service } from '@toeverything/infra';
import type { PresentationWSService } from './presentation-ws.service';

export interface GeminiLocalMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string;
}

export class GeminiChatService extends Service {
  readonly messages$ = new LiveData<GeminiLocalMessage[]>([]);
  readonly loading$ = new LiveData<boolean>(false);
  readonly error$ = new LiveData<string | null>(null);

  constructor(private readonly wsService: PresentationWSService) {
    super();
    // Listen for incoming streaming reply chunks
    this.wsService.geminiReplyChunk$.subscribe(chunkData => {
      if (!chunkData) return;

      if (chunkData.disabled) {
        this.loading$.setValue(false);
        this.error$.setValue(chunkData.disabledMessage ?? 'Disabled by host');
        return;
      }

      const current = this.messages$.value;
      const lastMsg = current[current.length - 1];

      if (lastMsg && lastMsg.role === 'model') {
        // Append chunk to the last model message
        const updatedContent = lastMsg.content + chunkData.chunk;
        const updatedMessages = [...current];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMsg,
          content: updatedContent,
          timestamp: Date.now(),
        };
        this.messages$.setValue(updatedMessages);
      } else {
        // Create a new model message on the first chunk
        if (chunkData.chunk || chunkData.done) {
          this.messages$.setValue([
            ...current,
            {
              role: 'model',
              content: chunkData.chunk,
              timestamp: Date.now(),
            },
          ]);
        }
      }

      if (chunkData.done) {
        this.loading$.setValue(false);
      }
    });

    // Restore gemini history on connect/refresh
    this.wsService.geminiHistory$.subscribe(history => {
      this.messages$.setValue(history);
    });
  }

  sendMessage(roomId: string, sessionId: string, text: string, displayLabel?: string, image?: string) {
    const current = this.messages$.value;
    this.messages$.setValue([
      ...current,
      {
        role: 'user',
        content: displayLabel || text,
        timestamp: Date.now(),
        image,
      },
    ]);
    this.loading$.setValue(true);
    this.error$.setValue(null);
    this.wsService.sendGeminiMessage(roomId, sessionId, text);
  }

  clear() {
    this.messages$.setValue([]);
    this.loading$.setValue(false);
    this.error$.setValue(null);
  }
}
