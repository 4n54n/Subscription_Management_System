import { type Framework } from '@toeverything/infra';
import { FetchService, ServerService, ServerScope } from '../cloud';
import { PresentationService } from './services/presentation.service';
import { PresentationWSService } from './services/presentation-ws.service';
import { GeminiChatService } from './services/gemini-chat.service';

export { PresentationService, PresentationWSService, GeminiChatService };
export * from './types';
export * from './utils';

export function configurePresentationModule(framework: Framework) {
  // FetchService and ServerService live inside ServerScope, so
  // all presentation services that depend on them must be scoped there too.
  framework
    .scope(ServerScope)
    .service(PresentationService, [FetchService])
    .service(PresentationWSService, [ServerService])
    .service(GeminiChatService, [PresentationWSService]);
}
