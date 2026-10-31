import { WithDisposable } from '@blocksuite/affine/global/lit';
import {
  DocModeProvider,
  FeatureFlagService,
} from '@blocksuite/affine/shared/services';
import { type SpecBuilder } from '@blocksuite/affine/shared/utils';
import type { EditorHost } from '@blocksuite/affine/std';
import { ShadowlessElement } from '@blocksuite/affine/std';
import type { BaseSelection } from '@blocksuite/affine/store';
import { ArrowDownBigIcon as ArrowDownIcon } from '@blocksuite/icons/lit';
import { css, html, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { debounce } from 'lodash-es';

import { AffineIcon } from '../_common/icons';
import {
  type ChatMessage,
  isChatAction,
  isChatMessage,
} from '../components/ai-chat-messages';
import { type AIError, AIProvider, UnauthorizedError } from '../provider';
import { type ChatContextValue } from './chat-context';
import { HISTORY_IMAGE_ACTIONS } from './const';
import { AIPreloadConfig } from './preload-config';

export class ChatPanelMessages extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    :host,
    chat-panel-messages {
      display: flex !important;
      flex-direction: column !important;
      flex: 1 1 0% !important;
      min-height: 0 !important;
      position: relative !important;
      overflow: hidden !important;
    }

    .chat-panel-messages-container {
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 24px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      overscroll-behavior: contain !important;
      -webkit-overflow-scrolling: touch !important;
      touch-action: pan-y !important;
      box-sizing: border-box !important;
    }

    chat-panel-assistant-message,
    chat-panel-user-message {
      display: contents;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
      color: var(--affine-text-primary-color);
      font-size: var(--affine-font-sm);
      font-weight: 500;
      user-select: none;
    }

    .messages-placeholder {
      width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      box-sizing: border-box;
      gap: 12px;
      margin: auto 0;
    }

    .messages-placeholder-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--affine-text-primary-color);
    }

    .messages-placeholder-title[data-loading='true'] {
      font-size: var(--affine-font-sm);
      color: var(--affine-text-secondary-color);
    }

    .onboarding-wrapper {
      display: flex;
      gap: 8px;
      flex-direction: column;
      margin-top: 16px;
    }

    .onboarding-item {
      display: flex;
      height: 28px;
      gap: 8px;
      align-items: center;
      justify-content: start;
      cursor: pointer;
    }

    .onboarding-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--affine-icon-color, var(--affine-text-secondary-color, #8e8d91));
      font-size: 16px;
      transition: color 0.2s ease;
    }

    .onboarding-item-icon svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      color: currentColor;
    }

    .onboarding-item:hover .onboarding-item-icon {
      color: var(--affine-primary-color, #0f62fe);
    }

    .onboarding-item-text {
      font-size: var(--affine-font-xs);
      font-weight: 400;
      color: var(--affine-text-primary-color);
      white-space: nowrap;
    }

    .down-indicator {
      position: absolute;
      left: 50%;
      transform: translate(-50%, 0);
      bottom: 24px;
      z-index: 1;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      border: 0.5px solid var(--affine-border-color);
      background-color: var(--affine-background-primary-color);
      box-shadow: var(--affine-shadow-2);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
  `;

  @state()
  accessor _selectionValue: BaseSelection[] = [];

  @state()
  accessor canScrollDown = false;

  @state()
  accessor avatarUrl = '';

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor isLoading!: boolean;

  @property({ attribute: false })
  accessor chatContextValue!: ChatContextValue;

  @property({ attribute: false })
  accessor getSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor createSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor updateContext!: (context: Partial<ChatContextValue>) => void;

  @property({ attribute: false })
  accessor previewSpecBuilder!: SpecBuilder;

  @query('.chat-panel-messages-container')
  accessor messagesContainer: HTMLDivElement | null = null;

  @property({
    type: String,
    attribute: 'data-testid',
    reflect: true,
  })
  accessor testId = 'chat-panel-messages';

  getScrollContainer(): HTMLDivElement | null {
    return this.messagesContainer;
  }

  private _renderAIOnboarding() {
    if (this.isLoading) {
      return nothing;
    }

    const activateCanvasHighlight = () => {
      this._setGlobalCanvasHighlight(true);
      setTimeout(() => {
        const status = this.chatContextValue?.status;
        if (status !== 'loading' && status !== 'transmitting') {
          this._setGlobalCanvasHighlight(false);
        }
      }, 7000);
    };

    const sendPrompt = (promptText: string, displayText?: string) => {
      if (!promptText) return;
      const activeItem = this.closest('chat-panel')?.querySelector('.onboarding-wrapper');
      if (activeItem) {
        activeItem.remove();
      }
      activateCanvasHighlight();
      const chatPanel = this.closest('chat-panel') as any;
      if (chatPanel && typeof chatPanel.send === 'function') {
        chatPanel.send(promptText, displayText);
        return;
      }
      const composer = this.closest('chat-panel')?.querySelector<any>(
        'ai-chat-composer'
      );
      if (composer && typeof composer.send === 'function') {
        composer.send(promptText, displayText);
        return;
      }
      const input = this.closest('chat-panel')?.querySelector<any>('ai-chat-input');
      if (input && typeof input.send === 'function') {
        input.send(promptText, displayText);
      }
    };

    const getCanvasText = () => {
      const textSegments: string[] = [];
      const visited = new Set<Node>();

      const UI_TEXT_NOISE = new Set([
        'zoom in', 'zoom out', 'fit to screen', 'reset zoom',
        'open shell terminal', 'close shell terminal',
        'open synchronized browser', 'close synchronized browser',
        'toggle dark / light mode', 'exit room', 'end meeting room',
        'attendees live chat', 'workspace copilot ai assistant',
        'ai audio/video translation panel', 'disabled by host',
        'affine-paragraph', 'affine-note', 'affine-frame', 'chat', 'translation',
        'ai assistant', 'summarize canvas notes', 'extract key action items'
      ]);

      const isNoise = (text: string): boolean => {
        const trimmed = text.trim().toLowerCase();
        if (!trimmed) return true;
        if (UI_TEXT_NOISE.has(trimmed)) return true;
        return false;
      };

      const addSegment = (rawText: string, prefix?: string) => {
        const trimmed = rawText.trim();
        if (!trimmed || isNoise(trimmed)) return;

        const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        lines.forEach(line => {
          if (isNoise(line)) return;
          const formatted = prefix ? `${prefix}: ${line}` : line;
          if (!textSegments.includes(formatted)) {
            textSegments.push(formatted);
          }
        });
      };

      // ── STRATEGY 1: BlockSuite Doc Model & Store Inspection (Memory Level) ──
      try {
        const host = this.host || (this.closest('chat-panel') as any)?.host;
        const doc = (host?.doc || (window as any).currentEditor?.doc) as any;
        if (doc) {
          const blocks = typeof doc.getBlocks === 'function' ? doc.getBlocks() : (doc.blocks?.values ? Array.from(doc.blocks.values()) : []);
          blocks.forEach((block: any) => {
            const model = block.model || block;
            const flavour = model?.flavour || '';

            if (flavour.includes('frame')) {
              const frameTitle = model.title || model.name || model.props?.title || (typeof model.text?.toString === 'function' ? model.text.toString() : '');
              if (frameTitle) addSegment(`[Frame: ${frameTitle}]`);
            }

            if (model?.text) {
              const txt = typeof model.text.toString === 'function' ? model.text.toString() : String(model.text);
              if (txt) addSegment(txt);
            } else if (model?.title) {
              addSegment(String(model.title));
            }

            if (flavour.includes('code') && model?.props?.code) {
              addSegment(String(model.props.code));
            }
          });

          // Surface element models (Shapes, Connectors, Edgeless Text)
          const surfaceBlocks = blocks.filter((b: any) => (b.model?.flavour || b.flavour || '').includes('surface'));
          surfaceBlocks.forEach((sb: any) => {
            const sm = sb.model || sb;
            const elementsMap = sm.elements || sm.elementModels || sm.props?.elements;
            if (elementsMap) {
              const elements = typeof elementsMap.values === 'function' ? Array.from(elementsMap.values()) : (Array.isArray(elementsMap) ? elementsMap : Object.values(elementsMap));
              elements.forEach((el: any) => {
                if (el?.text) {
                  const elText = typeof el.text.toString === 'function' ? el.text.toString() : String(el.text);
                  if (elText) addSegment(elText);
                }
              });
            }
          });
        }
      } catch (e) {
        console.debug('Model text extraction fallback:', e);
      }

      // ── STRATEGY 2: Deep DOM & Web Component Shadow DOM Traversal ──
      if (typeof document !== 'undefined') {
        const frames = document.querySelectorAll(
          'affine-frame-container, .affine-frame-container, affine-edgeless-frame, .edgeless-frame-container, affine-frame-card, .affine-frame-card, [data-frame-id]'
        );
        frames.forEach((frame, idx) => {
          const titleEl = frame.querySelector('.affine-frame-title, .frame-title, [data-frame-title]') || frame;
          const titleText = titleEl.textContent?.trim();
          if (titleText && !isNoise(titleText)) {
            addSegment(`[Frame ${idx + 1}: ${titleText}]`);
          }
        });

        const walk = (node: Node, currentPrefix?: string) => {
          if (visited.has(node)) return;
          visited.add(node);

          if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue?.trim();
            if (val && val.length > 0 && !val.startsWith('.') && !val.startsWith('[')) {
              addSegment(val, currentPrefix);
            }
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tagName = el.tagName.toLowerCase();

            if (['script', 'style', 'svg', 'path', 'g', 'symbol', 'button', 'input', 'select'].includes(tagName)) {
              return;
            }

            let prefix = currentPrefix;
            if (tagName.includes('frame') || el.classList.contains('affine-frame-container')) {
              const titleEl = el.querySelector('.affine-frame-title, .frame-title') || el;
              const title = titleEl.textContent?.trim();
              if (title && !isNoise(title)) {
                prefix = `Frame "${title.slice(0, 40)}"`;
              }
            }

            if (el.shadowRoot) {
              walk(el.shadowRoot, prefix);
            }

            el.childNodes.forEach(child => walk(child, prefix));
          }
        };

        const canvasContainers = Array.from(
          document.querySelectorAll(
            'affine-edgeless-root, affine-page-root, .affine-edgeless-container, .edgeless-editor-container, #canvasViewport, .main-canvas-area, .workspace-presentation-wrapper, .present-page-root main, main'
          )
        );

        if (canvasContainers.length > 0) {
          canvasContainers.forEach(container => walk(container));
        } else {
          walk(document.body);
        }
      }

      if (textSegments.length > 0) {
        return textSegments.join('\n- ');
      }

      return 'Whiteboard presentation notes and canvas content.';
    };

    return html`<div class="onboarding-wrapper" data-testid="ai-onboarding">
      <div
        data-testid="summarize-canvas-notes-item"
        @click=${() => {
          const text = getCanvasText();
          sendPrompt(
            `Please analyze and summarize all the text content, documents, and notes across this workspace page into clear key points:\n\n${text}`,
            'Summarizing canvas notes...'
          );
        }}
        class="onboarding-item"
      >
        <div class="onboarding-item-icon">✦</div>
        <div class="onboarding-item-text">Summarize canvas notes</div>
      </div>
      <div
        data-testid="extract-key-action-items-item"
        @click=${() => {
          const text = getCanvasText();
          sendPrompt(
            `Please extract key action items, tasks, and to-dos from all the notes and document content:\n\n${text}`,
            'Extracting key action items...'
          );
        }}
        class="onboarding-item"
      >
        <div class="onboarding-item-icon">✦</div>
        <div class="onboarding-item-text">Extract key action items</div>
      </div>
    </div>`;
  }

  private readonly _onScroll = () => {
    if (!this.messagesContainer) return;
    const { clientHeight, scrollTop, scrollHeight } = this.messagesContainer;
    this.canScrollDown = scrollHeight - scrollTop - clientHeight > 200;
  };

  private readonly _debouncedOnScroll = debounce(
    this._onScroll.bind(this),
    100
  );

  private readonly _onDownIndicatorClick = () => {
    this.canScrollDown = false;
    this.scrollToEnd();
  };

  protected override render() {
    const { messages, status, error } = this.chatContextValue;
    const { isLoading } = this;
    const isCanvasActionUserMessage = (item: any): boolean => {
      if (!item || item.role !== 'user') return false;
      const content = typeof item.content === 'string' ? item.content : '';
      if (!content) return false;
      return (
        content.includes('Please analyze and summarize') ||
        content.includes('Summarizing canvas notes') ||
        content.includes('Please extract key action items') ||
        content.includes('Extracting key action items') ||
        content.includes('Summarize canvas notes') ||
        content.includes('Extract key action items')
      );
    };

    const filteredItems = messages.filter(item => {
      if (isChatMessage(item) && item.role === 'user' && isCanvasActionUserMessage(item)) {
        return false;
      }
      return (
        isChatMessage(item) ||
        item.messages?.length === 3 ||
        (HISTORY_IMAGE_ACTIONS.includes(item.action) &&
          item.messages?.length === 2)
      );
    });

    const showDownIndicator =
      this.canScrollDown &&
      filteredItems.length > 0 &&
      this.chatContextValue.status !== 'transmitting';

    return html`
      <div
        class="chat-panel-messages-container"
        data-testid="chat-panel-messages-container"
        @scroll=${() => this._debouncedOnScroll()}
        @wheel=${(e: WheelEvent) => e.stopPropagation()}
        @touchstart=${(e: TouchEvent) => e.stopPropagation()}
        @touchmove=${(e: TouchEvent) => e.stopPropagation()}
      >
        ${filteredItems.length === 0
          ? html`<div
              class="messages-placeholder"
              data-testid="chat-panel-messages-placeholder"
            >
              ${AffineIcon(
                isLoading
                  ? 'var(--affine-icon-secondary)'
                  : 'var(--affine-primary-color)'
              )}
              <div class="messages-placeholder-title" data-loading=${isLoading}>
                ${this.isLoading
                  ? html`<span data-testid="chat-panel-loading-state"
                      >IntoAI is loading history...</span
                    >`
                  : html`<span data-testid="chat-panel-empty-state"
                      >What can I help you with?</span
                    >`}
              </div>
              ${this._renderAIOnboarding()}
            </div> `
          : repeat(
              filteredItems,
              (_, index) => index,
              (item, index) => {
                const isLast = index === filteredItems.length - 1;
                if (isChatMessage(item) && item.role === 'user') {
                  return html`<chat-message-user
                    .item=${item}
                  ></chat-message-user>`;
                } else if (isChatMessage(item) && item.role === 'assistant') {
                  return html`<chat-message-assistant
                    .host=${this.host}
                    .item=${item}
                    .isLast=${isLast}
                    .status=${isLast ? status : 'idle'}
                    .error=${isLast ? error : null}
                    .previewSpecBuilder=${this.previewSpecBuilder}
                    .getSessionId=${this.getSessionId}
                    .retry=${() => this.retry()}
                  ></chat-message-assistant>`;
                } else if (isChatAction(item)) {
                  return html`<chat-message-action
                    .host=${this.host}
                    .item=${item}
                  ></chat-message-action>`;
                }
                return nothing;
              }
            )}
      </div>
      ${showDownIndicator && filteredItems.length > 0
        ? html`<div
            data-testid="chat-panel-scroll-down-indicator"
            class="down-indicator"
            @click=${this._onDownIndicatorClick}
          >
            ${ArrowDownIcon()}
          </div>`
        : nothing}
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    const { disposables } = this;

    Promise.resolve(AIProvider.userInfo)
      .then(res => {
        this.avatarUrl = res?.avatarUrl ?? '';
      })
      .catch(console.error);

    disposables.add(
      AIProvider.slots.userInfo.subscribe(userInfo => {
        const { status, error } = this.chatContextValue;
        this.avatarUrl = userInfo?.avatarUrl ?? '';
        if (
          status === 'error' &&
          error instanceof UnauthorizedError &&
          userInfo
        ) {
          this.updateContext({ status: 'idle', error: null });
        }
      })
    );

    if (this.host) {
      const docModeService = this.host.std?.get(DocModeProvider);
      if (this.host.selection?.slots?.changed) {
        disposables.add(
          this.host.selection.slots.changed.subscribe(() => {
            this._selectionValue = this.host?.selection?.value;
          })
        );
      }
      if (docModeService && this.host.doc?.id) {
        disposables.add(
          docModeService.onPrimaryModeChange(
            () => this.requestUpdate(),
            this.host.doc.id
          )
        );
      }
    }
  }

  protected override firstUpdated(): void {
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (this.messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
        const isAtTop = scrollTop <= 0 && e.deltaY < 0;
        const isAtBottom =
          scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
        if (!isAtTop && !isAtBottom) {
          this.messagesContainer.scrollTop += e.deltaY;
        }
      }
    };
    const stopProp = (e: Event) => e.stopPropagation();
    this.addEventListener('wheel', handleWheel, {
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
    if (this.messagesContainer) {
      this.messagesContainer.addEventListener('wheel', handleWheel, {
        capture: true,
        passive: true,
      });
      this.messagesContainer.addEventListener('touchstart', stopProp, {
        capture: true,
        passive: true,
      });
      this.messagesContainer.addEventListener('touchmove', stopProp, {
        capture: true,
        passive: true,
      });
    }
  }

  _setGlobalCanvasHighlight(active: boolean) {
    let styleEl = document.getElementById('canvas-ai-glow-global-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'canvas-ai-glow-global-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @keyframes workspaceCanvasAIGlowPulse {
        0% {
          opacity: 0.65;
          box-shadow: inset 0 0 24px 4px rgba(15, 98, 254, 0.22), inset 0 0 48px 8px rgba(66, 133, 244, 0.12);
        }
        50% {
          opacity: 1;
          box-shadow: inset 0 0 45px 8px rgba(15, 98, 254, 0.38), inset 0 0 85px 16px rgba(66, 133, 244, 0.20);
        }
        100% {
          opacity: 0.65;
          box-shadow: inset 0 0 24px 4px rgba(15, 98, 254, 0.22), inset 0 0 48px 8px rgba(66, 133, 244, 0.12);
        }
      }

      .canvas-ai-active,
      .canvas-scanning-active {
        position: relative !important;
      }

      .canvas-ai-active::before,
      .canvas-scanning-active::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        pointer-events: none !important;
        z-index: 50 !important;
        border-radius: 12px !important;
        border: none !important;
        box-shadow: inset 0 0 35px 6px rgba(15, 98, 254, 0.30), inset 0 0 65px 12px rgba(66, 133, 244, 0.16);
        animation: workspaceCanvasAIGlowPulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
        transition: opacity 0.4s ease !important;
      }

      /* Prevent any nested / duplicate inner glow boxes */
      .canvas-ai-active .canvas-ai-active::before,
      .canvas-ai-active *::before {
        box-shadow: none !important;
      }
      .canvas-ai-active::before {
        box-shadow: inset 0 0 35px 6px rgba(15, 98, 254, 0.30), inset 0 0 65px 12px rgba(66, 133, 244, 0.16) !important;
      }

      /* Explicitly disable any glow inside Assistant Tab / Chat Panel / Sidebars */
      chat-panel,
      chat-panel *,
      chat-panel ::before,
      ai-chat-panel,
      ai-chat-panel *,
      ai-chat-panel ::before,
      chat-panel-messages,
      chat-panel-messages *,
      chat-panel-messages ::before,
      .chat-panel-container,
      .chat-panel-container *,
      .chat-panel-container ::before,
      .ai-answer-text-editor,
      .ai-answer-text-editor *,
      .ai-answer-text-editor::before,
      .sidebar-tab-content,
      .sidebar-tab-content *,
      .affine-sidebar-tab-content,
      .affine-sidebar-tab-content * {
        animation: none !important;
        box-shadow: none !important;
      }
    `;

    // Clear active highlight from all elements
    const allActive = document.querySelectorAll<HTMLElement>('.canvas-ai-active, .canvas-scanning-active');
    allActive.forEach(el => el.classList.remove('canvas-ai-active', 'canvas-scanning-active'));

    if (active) {
      // Find strictly ONE outermost canvas container
      const candidateSelectors = [
        'div[data-dynamic-top-border]',
        '.present-page-root > main',
        '.workspace-presentation-wrapper > .present-layout-container',
        '.doc-page-container',
        '.affine-page-viewport:not(.ai-answer-text-editor)',
        'page-editor',
        'edgeless-editor'
      ];

      for (const sel of candidateSelectors) {
        const found = document.querySelector<HTMLElement>(sel);
        if (
          found &&
          !found.closest('chat-panel') &&
          !found.closest('ai-chat-panel') &&
          !found.closest('chat-panel-messages') &&
          !found.closest('.chat-panel-container') &&
          !found.closest('.sidebar-tab-content') &&
          !found.closest('.affine-sidebar-tab-content') &&
          !found.classList.contains('ai-answer-text-editor')
        ) {
          found.classList.add('canvas-ai-active', 'canvas-scanning-active');
          break; // Stop after highlighting strictly ONE outermost container!
        }
      }
    }
  }

  protected override updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has('isLoading')) {
      this.canScrollDown = false;
    }
    if (_changedProperties.has('chatContextValue')) {
      this.scrollToEnd();
      const status = this.chatContextValue?.status;
      if (status === 'success' || status === 'error' || status === 'idle') {
        this._setGlobalCanvasHighlight(false);
      }
    }
  }

  scrollToEnd(instant = false) {
    const container =
      this.messagesContainer ||
      (this.messagesContainer = this.querySelector<HTMLDivElement>(
        '.chat-panel-messages-container'
      ));
    if (!container) return;

    const scrollAction = () => {
      container.scrollTop = container.scrollHeight;
    };

    if (instant) {
      scrollAction();
    } else {
      requestAnimationFrame(scrollAction);
      setTimeout(scrollAction, 50);
      setTimeout(scrollAction, 150);
    }
  }

  retry = async () => {
    try {
      const sessionId = await this.createSessionId();
      if (!sessionId) return;
      if (!AIProvider.actions.chat) return;

      const abortController = new AbortController();
      const messages = [...this.chatContextValue.messages];
      const last = messages[messages.length - 1];
      if ('content' in last) {
        last.content = '';
        last.createdAt = new Date().toISOString();
      }
      this.updateContext({ messages, status: 'loading', error: null });

      const { doc } = this.host;
      const stream = await AIProvider.actions.chat({
        sessionId,
        retry: true,
        docId: doc.id,
        workspaceId: doc.workspace.id,
        host: this.host,
        stream: true,
        signal: abortController.signal,
        where: 'chat-panel',
        control: 'chat-send',
        isRootSession: true,
      });
      this.updateContext({ abortController });
      for await (const text of stream) {
        const messages = [...this.chatContextValue.messages];
        const last = messages[messages.length - 1] as ChatMessage;
        last.content += text;
        this.updateContext({ messages, status: 'transmitting' });
      }

      this.updateContext({ status: 'success' });
    } catch (error) {
      this.updateContext({ status: 'error', error: error as AIError });
    } finally {
      this.updateContext({ abortController: null });
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel-messages': ChatPanelMessages;
  }
}

