import './chat-panel-messages';

import { Tooltip } from '@blocksuite/affine/components/toolbar';
import { noop } from '@blocksuite/affine/global/utils';
import type { ContextEmbedStatus } from '@affine/graphql';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/lit';
import type { SpecBuilder } from '@blocksuite/affine/shared/utils';
import type { EditorHost } from '@blocksuite/affine/std';
import { ShadowlessElement } from '@blocksuite/affine/std';
import type { Store } from '@blocksuite/affine/store';
import { HelpIcon } from '@blocksuite/icons/lit';
import { type Signal, signal } from '@preact/signals-core';

noop(Tooltip);
import { css, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';

import type {
  DocDisplayConfig,
  SearchMenuConfig,
} from '../components/ai-chat-chips';
import type { AIChatComposer } from '../components/ai-chat-composer/ai-chat-composer';
import type { AINetworkSearchConfig } from '../components/ai-chat-input';
import { type HistoryMessage } from '../components/ai-chat-messages';
import { AIProvider } from '../provider';
import { extractSelectedContent } from '../utils/extract';
import {
  getSelectedImagesAsBlobs,
  getSelectedTextContent,
} from '../utils/selection-utils';
import type { AppSidebarConfig } from './chat-config';
import type { ChatContextValue } from './chat-context';
import type { ChatPanelMessages } from './chat-panel-messages';

const DEFAULT_CHAT_CONTEXT_VALUE: ChatContextValue = {
  quote: '',
  images: [],
  abortController: null,
  messages: [],
  status: 'idle',
  error: null,
  markdown: '',
};

export function openCompanyWebsiteUrl() {
  let websiteUrl = '';
  try {
    const raw = localStorage.getItem('intoai_company_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.websiteUrl && typeof parsed.websiteUrl === 'string' && parsed.websiteUrl.trim()) {
        websiteUrl = parsed.websiteUrl.trim();
      }
    }
  } catch {}

  const openUrl = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  if (websiteUrl) {
    openUrl(websiteUrl);
    return;
  }

  fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetCompanyProfile { companyProfile }`,
    }),
  })
    .then(res => res.json())
    .then(json => {
      const cp = json?.data?.companyProfile;
      const fetchedUrl = cp?.websiteUrl && typeof cp.websiteUrl === 'string' ? cp.websiteUrl.trim() : '';
      if (fetchedUrl) {
        try {
          const stored = JSON.parse(localStorage.getItem('intoai_company_profile') || '{}');
          localStorage.setItem('intoai_company_profile', JSON.stringify({ ...stored, websiteUrl: fetchedUrl }));
        } catch {}
        openUrl(fetchedUrl);
      } else {
        openUrl('https://intoai.ai');
      }
    })
    .catch(() => {
      openUrl('https://intoai.ai');
    });
}

export class ChatPanel extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    :host,
    chat-panel {
      width: 100%;
      height: 100%;
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      min-height: 0;
      user-select: text;
    }

    .chat-panel-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .chat-panel-title {
      background: var(--affine-background-primary-color);
      position: relative;
      padding: 8px 0px;
      width: 100%;
      height: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1;

      div:first-child {
        font-size: 14px;
        font-weight: 500;
        color: var(--affine-text-secondary-color);
      }

      .chat-panel-help-btn {
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;

        &:hover {
          background-color: var(--affine-hover-color, rgba(140, 140, 140, 0.18));
          transform: scale(1.1);
        }
      }

      .custom-help-tooltip {
        position: absolute;
        right: calc(100% + 8px);
        top: 50%;
        transform: translateY(-50%);
        background: var(--affine-tooltip-background, #1e293b);
        color: #ffffff;
        font-size: 11px;
        font-weight: 500;
        padding: 4px 10px;
        border-radius: 6px;
        white-space: nowrap !important;
        word-break: keep-all !important;
        width: max-content !important;
        max-width: none !important;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, visibility 0.15s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 99999;
      }

      .custom-help-tooltip::after {
        content: '';
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-width: 4px;
        border-style: solid;
        border-color: transparent transparent transparent var(--affine-tooltip-background, #1e293b);
      }

      .chat-panel-help-btn:hover .custom-help-tooltip {
        opacity: 1;
        visibility: visible;
      }

      svg {
        width: 18px;
        height: 18px;
        color: var(--affine-text-secondary-color);
      }
    }

    chat-panel-messages {
      flex: 1 1 0%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    ai-chat-composer {
      flex-shrink: 0;
    }

    .chat-panel-hints {
      margin: 0 4px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--affine-border-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .chat-panel-hints :first-child {
      color: var(--affine-text-primary-color);
    }

    .chat-panel-hints :nth-child(2) {
      color: var(--affine-text-secondary-color);
    }
  `;

  private readonly _chatMessagesRef: Ref<ChatPanelMessages> =
    createRef<ChatPanelMessages>();

// request counter to track the latest request
  private _updateHistoryCounter = 0;

  private readonly _updateHistory = async () => {
    const { doc } = this;

    const currentRequest = ++this._updateHistoryCounter;

    const [histories, actions] = await Promise.all([
      AIProvider.histories?.chats(doc.workspace.id, doc.id),
      AIProvider.histories?.actions(doc.workspace.id, doc.id),
    ]);

    // Check if this is still the latest request
    if (currentRequest !== this._updateHistoryCounter) {
      return;
    }

    const messages: HistoryMessage[] = actions ? [...actions] : [];

    const sessionId = await this._getSessionId();
    const history = histories?.find(history => history.sessionId === sessionId);
    if (history) {
      messages.push(...history.messages);
    }

    this.chatContextValue = {
      ...this.chatContextValue,
      messages: messages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    };

    this._scrollToEnd();
  };

  private readonly _updateEmbeddingProgress = (
    count: Record<ContextEmbedStatus, number>
  ) => {
    const total = count.finished + count.processing + count.failed;
    this.embeddingProgress = [count.finished, total];
  };

  private readonly _getSessionId = async () => {
    if (this._sessionId) {
      return this._sessionId;
    }
    const sessions = (
      (await AIProvider.session?.getSessions(
        this.doc.workspace.id,
        this.doc.id,
        { action: false }
      )) || []
    ).filter(session => !session.parentSessionId);
    const sessionId = sessions.at(-1)?.id;
    this._sessionId = sessionId;
    return this._sessionId;
  };

  private readonly _createSessionId = async () => {
    if (this._sessionId) {
      return this._sessionId;
    }
    this._sessionId = await AIProvider.session?.createSession({
      docId: this.doc.id,
      workspaceId: this.doc.workspace.id,
      promptName: 'Chat With IntoAI',
    });
    return this._sessionId;
  };

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor doc!: Store;

  @property({ attribute: false })
  accessor networkSearchConfig!: AINetworkSearchConfig;

  @property({ attribute: false })
  accessor appSidebarConfig!: AppSidebarConfig;

  @property({ attribute: false })
  accessor searchMenuConfig!: SearchMenuConfig;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  @property({ attribute: false })
  accessor previewSpecBuilder!: SpecBuilder;

  @state()
  accessor isLoading = false;

  @state()
  accessor chatContextValue: ChatContextValue = DEFAULT_CHAT_CONTEXT_VALUE;

  @state()
  accessor embeddingProgress: [number, number] = [0, 0];

  private _isInitialized = false;

  // always use getSessionId to get the sessionId
  private _sessionId: string | undefined = undefined;

  private _isSidebarOpen: Signal<boolean | undefined> = signal(false);

  private _sidebarWidth: Signal<number | undefined> = signal(undefined);

  private _userScrolledUp = false;

  private readonly _checkUserScrolledUp = () => {
    const container = this._chatMessagesRef.value?.getScrollContainer();
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    this._userScrolledUp = scrollHeight - scrollTop - clientHeight > 80;
  };

  private readonly _scrollToEnd = (instant = true) => {
    if (!this._userScrolledUp) {
      this._chatMessagesRef.value?.scrollToEnd(instant);
    }
  };

  private readonly _initPanel = async () => {
    try {
      if (!this._isSidebarOpen.value) return;
      if (this.isLoading) return;
      const userId = (await AIProvider.userInfo)?.id;
      if (!userId) return;

      this.isLoading = true;
      await this._updateHistory();
      this.isLoading = false;
      this._isInitialized = true;
    } catch (error) {
      console.error(error);
    }
  };

  private readonly _resetPanel = () => {
    this._sessionId = undefined;
    this.chatContextValue = DEFAULT_CHAT_CONTEXT_VALUE;
    this.isLoading = false;
    this._isInitialized = false;
    this.embeddingProgress = [0, 0];
  };

  protected override updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has('doc')) {
      this._resetPanel();
      requestAnimationFrame(async () => {
        await this._initPanel();
      });
    }

    if (this.chatContextValue.status === 'loading') {
      this._userScrolledUp = false;
      this._scrollToEnd(true);
    }

    if (
      _changedProperties.has('chatContextValue') &&
      this.chatContextValue.status === 'transmitting'
    ) {
      this._scrollToEnd(true);
    }

    if (
      _changedProperties.has('chatContextValue') &&
      (this.chatContextValue.status === 'error' ||
        this.chatContextValue.status === 'success')
    ) {
      this._scrollToEnd(true);
    }
  }

  protected override firstUpdated(): void {
    const chatMessages = this._chatMessagesRef.value;
    if (chatMessages) {
      chatMessages.updateComplete
        .then(() => {
          const container = chatMessages.getScrollContainer();
          if (container) {
            container.addEventListener('scroll', this._checkUserScrolledUp, {
              passive: true,
            });
            const handleWheel = (e: WheelEvent) => {
              e.stopPropagation();
              const { scrollTop, scrollHeight, clientHeight } = container;
              const isAtTop = scrollTop <= 0 && e.deltaY < 0;
              const isAtBottom =
                scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
              if (!isAtTop && !isAtBottom) {
                container.scrollTop += e.deltaY;
              }
            };
            const stopProp = (e: Event) => e.stopPropagation();
            container.addEventListener('wheel', handleWheel, {
              capture: true,
              passive: true,
            });
            container.addEventListener('touchstart', stopProp, {
              capture: true,
              passive: true,
            });
            container.addEventListener('touchmove', stopProp, {
              capture: true,
              passive: true,
            });
          }
        })
        .catch(console.error);
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.doc) throw new Error('doc is required');

    const handleHostWheel = (e: WheelEvent) => {
      e.stopPropagation();
      const container = this._chatMessagesRef.value?.getScrollContainer();
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtTop = scrollTop <= 0 && e.deltaY < 0;
        const isAtBottom =
          scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
        if (!isAtTop && !isAtBottom) {
          container.scrollTop += e.deltaY;
        }
      }
    };
    const stopProp = (e: Event) => e.stopPropagation();
    this.addEventListener('wheel', handleHostWheel, {
      capture: true,
      passive: true,
    });
    this.addEventListener('touchstart', stopProp, {
      capture: true,
      passive: true,
    });
    this.addEventListener('touchmove', stopProp, {
      capture: true,
      passive: true,
    });

    this._disposables.add(
      AIProvider.slots.actions.subscribe(({ event }) => {
        const { status } = this.chatContextValue;
        if (
          event === 'finished' &&
          (status === 'idle' || status === 'success')
        ) {
          this._updateHistory().catch(console.error);
        }
      })
    );
    this._disposables.add(
      AIProvider.slots.userInfo.subscribe(() => {
        this._initPanel().catch(console.error);
      })
    );
    this._disposables.add(
      AIProvider.slots.requestOpenWithChat.subscribe(({ host }) => {
        if (this.host === host) {
          extractSelectedContent(host)
            .then(context => {
              if (!context) return;
              this.updateContext(context);
            })
            .catch(console.error);
        }
      })
    );

    const isOpen = this.appSidebarConfig?.isOpen?.();
    this._isSidebarOpen = isOpen?.signal ?? (isOpen as any) ?? signal(true);
    if (isOpen?.cleanup) {
      this._disposables.add(isOpen.cleanup);
    }

    const width = this.appSidebarConfig?.getWidth?.();
    this._sidebarWidth = width?.signal ?? (width as any) ?? signal(0);
    if (width?.cleanup) {
      this._disposables.add(width.cleanup);
    }

    if (!this._isInitialized) {
      this._initPanel().catch(console.error);
    }

    this._checkSearchGroundingSupport();

    this._disposables.add(
      this._isSidebarOpen.subscribe(isOpen => {
        if (isOpen && !this._isInitialized) {
          this._initPanel().catch(console.error);
        }
      })
    );
  }

  updateContext = (context: Partial<ChatContextValue>) => {
    this.chatContextValue = { ...this.chatContextValue, ...context };
  };

  continueInChat = async () => {
    const text = await getSelectedTextContent(this.host, 'plain-text');
    const markdown = await getSelectedTextContent(this.host, 'markdown');
    const images = await getSelectedImagesAsBlobs(this.host);
    this.updateContext({
      quote: text,
      markdown,
      images,
    });
  };

  private _networkSearchEnabledSignal = signal(false);
  private _networkSearchVisibleSignal = signal(true);

  private _checkSearchGroundingSupport = () => {
    fetch('/api/copilot/search-grounding-status')
      .then(res => res.json())
      .then(data => {
        if (typeof data?.supported === 'boolean') {
          this._networkSearchVisibleSignal.value = data.supported;
          if (!data.supported) {
            this._networkSearchEnabledSignal.value = false;
          }
          this.requestUpdate();
        }
      })
      .catch(() => {});
  };

  private get _effectiveNetworkSearchConfig(): AINetworkSearchConfig {
    if (this.networkSearchConfig) {
      return this.networkSearchConfig;
    }
    return {
      visible: this._networkSearchVisibleSignal,
      enabled: this._networkSearchEnabledSignal,
      setEnabled: (enabled: boolean) => {
        this._networkSearchEnabledSignal.value = enabled;
        this.requestUpdate();
      },
    };
  }

  override render() {
    const width = this._sidebarWidth.value || 0;
    const style = styleMap({
      padding: width > 540 ? '8px 24px 0 24px' : '8px 12px 0 12px',
    });
    const [done, total] = this.embeddingProgress;
    const isEmbedding = total > 0 && done < total;

    return html`<div class="chat-panel-container" style=${style}>
      <div class="chat-panel-title">
        <div>
          ${isEmbedding
            ? html`<span data-testid="chat-panel-embedding-progress"
                >Embedding ${done}/${total}</span
              >`
            : 'IntoAI'}
        </div>
        <div
          class="chat-panel-help-btn"
          @click=${(e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            openCompanyWebsiteUrl();
          }}
        >
          ${HelpIcon()}
          <div class="custom-help-tooltip">Visit Official Website</div>
        </div>
      </div>
      <chat-panel-messages
        ${ref(this._chatMessagesRef)}
        .chatContextValue=${this.chatContextValue}
        .getSessionId=${this._getSessionId}
        .createSessionId=${this._createSessionId}
        .updateContext=${this.updateContext}
        .host=${this.host}
        .isLoading=${this.isLoading}
        .previewSpecBuilder=${this.previewSpecBuilder}
      ></chat-panel-messages>
      <ai-chat-composer
        .host=${this.host}
        .doc=${this.doc}
        .getSessionId=${this._getSessionId}
        .createSessionId=${this._createSessionId}
        .chatContextValue=${this.chatContextValue}
        .updateContext=${this.updateContext}
        .updateEmbeddingProgress=${this._updateEmbeddingProgress}
        .onHistoryCleared=${this._updateHistory}
        .isVisible=${this._isSidebarOpen}
        .networkSearchConfig=${this._effectiveNetworkSearchConfig}
        .docDisplayConfig=${this.docDisplayConfig}
        .searchMenuConfig=${this.searchMenuConfig}
        .trackOptions=${{
          where: 'chat-panel',
          control: 'chat-send',
        }}
      ></ai-chat-composer>
    </div>`;
  }

  send(text: string, displayText?: string) {
    const composer = this.querySelector<AIChatComposer>('ai-chat-composer');
    if (composer) {
      composer.send(text, displayText);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}

