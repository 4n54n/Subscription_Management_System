import React from 'react';
import { CommentIcon, AiIcon, VoiceIcon } from '@blocksuite/icons/rc';
import type {
  ChatMessage,
  RoomMember,
  PresentationRoom,
  TranslationMessage,
} from '../../../../modules/presentation/types';
import { PresentMarkdown } from './present-markdown';
import { EditorChatPanel } from '../detail-page/tabs/chat';

interface ChatSidebarProps {
  rightSidebarOpen: boolean;
  activeRightTab: 'chat' | 'gemini' | 'translate';
  setActiveRightTab: (tab: 'chat' | 'gemini' | 'translate') => void;
  chatMessages: ChatMessage[];
  translationMessages?: TranslationMessage[];
  isTranscribing?: boolean;
  sessionId: string;
  isHost: boolean;
  members: RoomMember[];
  room: PresentationRoom | null;
  replyingTo: { sessionId: string; name: string } | null;
  setReplyingTo: (val: { sessionId: string; name: string } | null) => void;
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendChat: () => void;
  geminiMessages: Array<{ role: 'user' | 'model'; content: string; image?: string }>;
  geminiLoading: boolean;
  geminiError: string | null;
  geminiInput: string;
  setGeminiInput: (val: string) => void;
  handleSendGemini: (prompt?: string, displayLabel?: string) => void;
  handleSendGeminiPrompt?: (promptText: string, displayLabel?: string) => void;
  setRightSidebarOpen?: (val: boolean) => void;
  unreadChatCount?: number;
  editor?: any;
  wsService?: any;
  mediaPerms?: any;
  onToggleTranslation?: (enabled: boolean) => void;
}

export const AGORA_TRANSLATION_LANGUAGES = [
  { code: 'af', label: 'Afrikaans' },
  { code: 'sq', label: 'Albanian (Shqip)' },
  { code: 'am', label: 'Amharic (አማርኛ)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'hy', label: 'Armenian (Հայերեն)' },
  { code: 'az', label: 'Azerbaijani (Azərbaycan)' },
  { code: 'eu', label: 'Basque (Euskara)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'bs', label: 'Bosnian (Bosanski)' },
  { code: 'bg', label: 'Bulgarian (Български)' },
  { code: 'my', label: 'Burmese (မြန်မာ)' },
  { code: 'ca', label: 'Catalan (Català)' },
  { code: 'zh', label: 'Chinese - Simplified (简体中文)' },
  { code: 'zh-TW', label: 'Chinese - Traditional (繁體中文)' },
  { code: 'hr', label: 'Croatian (Hrvatski)' },
  { code: 'cs', label: 'Czech (Čeština)' },
  { code: 'da', label: 'Danish (Dansk)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
  { code: 'en', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'et', label: 'Estonian (Eesti)' },
  { code: 'fil', label: 'Filipino / Tagalog' },
  { code: 'fi', label: 'Finnish (Suomi)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'fr-CA', label: 'French - Canada (Français)' },
  { code: 'gl', label: 'Galician (Galego)' },
  { code: 'ka', label: 'Georgian (ქართული)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'el', label: 'Greek (Ελληνικά)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'he', label: 'Hebrew (עברית)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'hu', label: 'Hungarian (Magyar)' },
  { code: 'is', label: 'Icelandic (Íslenska)' },
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'kk', label: 'Kazakh (Қазақ)' },
  { code: 'km', label: 'Khmer (ខ្មែរ)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'lo', label: 'Lao (ລາວ)' },
  { code: 'lv', label: 'Latvian (Latviešu)' },
  { code: 'lt', label: 'Lithuanian (Lietuvių)' },
  { code: 'mk', label: 'Macedonian (Македонски)' },
  { code: 'ms', label: 'Malay (Bahasa Melayu)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'mn', label: 'Mongolian (Монгол)' },
  { code: 'ne', label: 'Nepali (नेपाली)' },
  { code: 'no', label: 'Norwegian (Norsk)' },
  { code: 'fa', label: 'Persian / Farsi (فارسی)' },
  { code: 'pl', label: 'Polish (Polski)' },
  { code: 'pt', label: 'Portuguese - Brazil (Português)' },
  { code: 'pt-PT', label: 'Portuguese - Portugal (Português)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ro', label: 'Romanian (Română)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'sr', label: 'Serbian (Српски)' },
  { code: 'si', label: 'Sinhala (සිංහල)' },
  { code: 'sk', label: 'Slovak (Slovenčina)' },
  { code: 'sl', label: 'Slovenian (Slovenščina)' },
  { code: 'so', label: 'Somali (Soomaali)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'es-419', label: 'Spanish - Latin America (Español)' },
  { code: 'sw', label: 'Swahili (Kiswahili)' },
  { code: 'sv', label: 'Swedish (Svenska)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'th', label: 'Thai (ไทย)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'uk', label: 'Ukrainian (Українська)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'uz', label: 'Uzbek (Oʻzbek)' },
  { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
  { code: 'cy', label: 'Welsh (Cymraeg)' },
  { code: 'zu', label: 'Zulu (isiZulu)' },
];

export const extractCanvasTextContent = (editorHost?: any): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'Whiteboard notes and presentation content.';
  }

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
    const doc = (editorHost?.doc || (window as any).currentEditor?.doc) as any;
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

  return 'Whiteboard notes and presentation content.';
};

export const runVirtualMouseAnimation = (clickPos?: { clientX: number; clientY: number }) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const findTarget = () => {
    return (
      document.querySelector('[data-testid="summarize-canvas-notes-item"]') ||
      document.querySelector('.onboarding-item:first-child') ||
      Array.from(document.querySelectorAll('.onboarding-item-text')).find(
        el => el.textContent?.toLowerCase().includes('summarize canvas')
      )?.closest('.onboarding-item')
    );
  };

  const startAnim = (targetEl: Element) => {
    let startX = clickPos && clickPos.clientX > 0 ? clickPos.clientX : window.innerWidth - 260;
    let startY = clickPos && clickPos.clientY > 0 ? clickPos.clientY : 80;

    const targetRect = targetEl.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    const cursorContainer = document.createElement('div');
    cursorContainer.className = 'virtual-blue-mouse-pointer';
    cursorContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 32px;
      height: 32px;
      z-index: 999999;
      pointer-events: none;
      transform: translate3d(${startX}px, ${startY}px, 0);
      transition: transform 1.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease;
      will-change: transform, opacity;
      filter: drop-shadow(0 4px 14px rgba(15, 98, 254, 0.75));
    `;

    cursorContainer.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%;">
        <div class="virtual-mouse-pulse-ring" style="
          position: absolute;
          top: -8px;
          left: -8px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #0f62fe;
          background: rgba(15, 98, 254, 0.22);
          opacity: 0.85;
          animation: vmouse-pulse 1.2s infinite ease-in-out;
        "></div>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="position: relative; z-index: 2;">
          <path d="M5.63604 3.00004L20.364 12.364L13.2426 14.2426L18 21.0001L15.0001 23L10.2426 16.2426L5.63604 20.364V3.00004Z"
                fill="#0f62fe" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      </div>
    `;

    document.body.appendChild(cursorContainer);

    if (!document.getElementById('virtual-mouse-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'virtual-mouse-styles';
      styleEl.innerHTML = `
        @keyframes vmouse-pulse {
          0% { transform: scale(0.75); opacity: 0.85; }
          50% { transform: scale(1.35); opacity: 0.3; }
          100% { transform: scale(0.75); opacity: 0.85; }
        }
        @keyframes vmouse-click-effect {
          0% { transform: scale(1); }
          35% { transform: scale(0.7); }
          65% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cursorContainer.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      });
    });

    setTimeout(() => {
      cursorContainer.style.animation = 'vmouse-click-effect 0.3s ease-in-out';

      if (targetEl instanceof HTMLElement) {
        targetEl.classList.add('onboarding-item-auto-clicked');
        targetEl.click();
        setTimeout(() => targetEl.classList.remove('onboarding-item-auto-clicked'), 500);
      }

      setTimeout(() => {
        cursorContainer.style.opacity = '0';
        setTimeout(() => {
          cursorContainer.remove();
        }, 350);
      }, 450);
    }, 1400);
  };

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const target = findTarget();
    if (target) {
      clearInterval(interval);
      startAnim(target);
    } else if (attempts >= 18) {
      clearInterval(interval);
    }
  }, 60);
};

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  rightSidebarOpen,
  activeRightTab,
  setActiveRightTab,
  chatMessages,
  translationMessages = [],
  isTranscribing = false,
  sessionId,
  isHost,
  members,
  room,
  replyingTo,
  setReplyingTo,
  chatInput,
  setChatInput,
  handleSendChat,
  geminiMessages,
  geminiLoading,
  geminiError,
  geminiInput,
  setGeminiInput,
  handleSendGemini,
  handleSendGeminiPrompt,
  setRightSidebarOpen,
  unreadChatCount = 0,
  editor,
  wsService,
  mediaPerms,
  onToggleTranslation,
}) => {
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>(() => {
    try {
      return localStorage.getItem('intoai_present_trans_lang') || 'es';
    } catch (_) {
      return 'es';
    }
  });

  const [translationSearch, setTranslationSearch] = React.useState('');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [translationsCache, setTranslationsCache] = React.useState<Record<string, Record<string, string>>>({});
  const [translatingIds, setTranslatingIds] = React.useState<Set<string>>(new Set());

  const translateContainerRef = React.useRef<HTMLDivElement>(null);
  const geminiInputRef = React.useRef<HTMLInputElement>(null);
  const chatInputRef = React.useRef<HTMLInputElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const geminiContainerRef = React.useRef<HTMLDivElement>(null);
  const chatPanelRef = React.useRef<any>(null);
  const hasAnimatedAiTabRef = React.useRef(false);
  const lastMousePosRef = React.useRef<{ clientX: number; clientY: number } | null>(null);

  const isTranslationActive = mediaPerms?.allowTranslation ?? room?.permissions?.allowTranslation ?? false;

  // Persist chosen target language
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    try {
      localStorage.setItem('intoai_present_trans_lang', lang);
    } catch (_) {}
  };

  // Auto-translate speech messages on the fly
  React.useEffect(() => {
    if (!isTranslationActive || translationMessages.length === 0) return;

    translationMessages.forEach(msg => {
      const existing = msg.translations?.[selectedLanguage] || translationsCache[msg.id]?.[selectedLanguage];
      if (existing || translatingIds.has(`${msg.id}_${selectedLanguage}`)) {
        return;
      }

      setTranslatingIds(prev => new Set(prev).add(`${msg.id}_${selectedLanguage}`));

      fetch('/api/presentation/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.originalText,
          targetLang: selectedLanguage,
          sourceLang: msg.originalLanguage,
          workspaceId: room?.workspaceId,
        }),
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.translatedText) {
            setTranslationsCache(prev => ({
              ...prev,
              [msg.id]: {
                ...(prev[msg.id] || {}),
                [selectedLanguage]: data.translatedText,
              },
            }));
          }
        })
        .catch(err => console.debug('[Translate] auto-translate error:', err))
        .finally(() => {
          setTranslatingIds(prev => {
            const next = new Set(prev);
            next.delete(`${msg.id}_${selectedLanguage}`);
            return next;
          });
        });
    });
  }, [translationMessages, selectedLanguage, isTranslationActive, room?.workspaceId]);

  // Auto-scroll translation stream to bottom on new messages
  React.useEffect(() => {
    if (activeRightTab === 'translate' && translateContainerRef.current) {
      translateContainerRef.current.scrollTop = translateContainerRef.current.scrollHeight;
    }
  }, [translationMessages.length, activeRightTab, translationsCache]);

  const handleCopyTranslation = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (_) {}
  };

  const handleDownloadTranscript = () => {
    if (translationMessages.length === 0) return;
    const langNames: Record<string, string> = {
      en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French',
      de: 'German', ja: 'Japanese', zh: 'Chinese', ar: 'Arabic',
      pt: 'Portuguese', ru: 'Russian', it: 'Italian', ko: 'Korean',
    };
    const targetName = langNames[selectedLanguage] || selectedLanguage;

    let content = `MEETING TRANSCRIPT & LIVE TRANSLATION (${targetName})\n`;
    content += `Room: ${room?.title || room?.permissions?.title || 'Meeting Room'}\n`;
    content += `Date: ${new Date().toLocaleString()}\n`;
    content += `Generated by Agora Audio-to-Text & AI Translation\n`;
    content += `=======================================================\n\n`;

    translationMessages.forEach(msg => {
      const timeStr = new Date(msg.timestamp).toLocaleTimeString();
      const translated = msg.translations?.[selectedLanguage] || translationsCache[msg.id]?.[selectedLanguage] || msg.originalText;
      content += `[${timeStr}] ${msg.speakerName}:\n`;
      content += `  Original:   ${msg.originalText}\n`;
      content += `  Translated: ${translated}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meeting_Transcript_${selectedLanguage}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    if (rightSidebarOpen && activeRightTab === 'gemini' && !hasAnimatedAiTabRef.current) {
      hasAnimatedAiTabRef.current = true;
      runVirtualMouseAnimation(lastMousePosRef.current || undefined);
    }
  }, [rightSidebarOpen, activeRightTab]);

  const scrollToChatBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 10);
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const scrollToGeminiBottom = () => {
    setTimeout(() => {
      if (geminiContainerRef.current) {
        geminiContainerRef.current.scrollTop = geminiContainerRef.current.scrollHeight;
      }
    }, 10);
    setTimeout(() => {
      if (geminiContainerRef.current) {
        geminiContainerRef.current.scrollTop = geminiContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Auto-scroll chat tab container to bottom when messages arrive
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeRightTab, rightSidebarOpen]);

  // Auto-scroll AI Assistant tab container to bottom when messages, chunks or loading change
  React.useEffect(() => {
    if (geminiContainerRef.current) {
      geminiContainerRef.current.scrollTop = geminiContainerRef.current.scrollHeight;
    }
  }, [geminiMessages, geminiLoading, geminiError, activeRightTab, rightSidebarOpen]);

  React.useEffect(() => {
    if (activeRightTab === 'gemini' && rightSidebarOpen && !geminiLoading) {
      const t1 = setTimeout(() => geminiInputRef.current?.focus(), 50);
      const t2 = setTimeout(() => geminiInputRef.current?.focus(), 150);
      const t3 = setTimeout(() => geminiInputRef.current?.focus(), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [activeRightTab, rightSidebarOpen, geminiLoading]);

  return (
    <aside
      className="present-sidebar-right"
      style={{
        gridArea: 'rsidebar',
        width: rightSidebarOpen ? '340px' : '0px',
        minWidth: '0px',
        height: '100%',
        background: 'var(--affine-background-primary-color)',
        border: rightSidebarOpen ? '1px solid var(--affine-border-color)' : 'none',
        borderRadius: '12px',
        boxShadow: rightSidebarOpen
          ? '0 4px 12px rgba(0, 0, 0, 0.04)'
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
        opacity: rightSidebarOpen ? 1 : 0,
        transform: rightSidebarOpen ? 'translateX(0)' : 'translateX(15px)',
        pointerEvents: rightSidebarOpen ? 'auto' : 'none',
        transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.28s ease',
        willChange: 'width, opacity, transform',
        paddingTop: 0,
        marginTop: 0,
      }}
    >
      {/* Small arrow icon in vertical center on the left edge to collapse right sidebar when opened */}
      {rightSidebarOpen && setRightSidebarOpen && (
        <button
          onClick={() => setRightSidebarOpen(false)}
          className="sidebar-left-collapse-arrow"
          data-tooltip="Collapse Right Sidebar"
          style={{
            position: 'absolute',
            left: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--affine-background-primary-color, #ffffff)',
            border: '1px solid var(--affine-border-color, #e0e6ed)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1005,
            color: 'var(--affine-text-primary-color, #1e293b)',
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

        {/* Segmented Control Tab Holder Container */}
        <div className="rightbar-tabs-header" style={{ marginTop: '-19px' }}>
          <div className="rightbar-tabs">
            <button
              onClick={() => {
                setActiveRightTab('chat');
                if (room?.id && wsService?.requestChatHistory) {
                  wsService.requestChatHistory(room.id, sessionId);
                }
              }}
              className={`tab-btn chat-tab-btn ${activeRightTab === 'chat' ? 'active' : ''}`}
              data-tooltip="Attendees Live Chat"
              data-testid="chat-tab-btn"
              data-tab="chat"
              style={{ position: 'relative' }}
            >
              <CommentIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              <span>Chat</span> <span className="tab-badge">{chatMessages.length}</span>
              {unreadChatCount > 0 && activeRightTab !== 'chat' && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#0f62fe',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    minWidth: '14px',
                    height: '14px',
                    padding: '0 3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    pointerEvents: 'none',
                  }}
                >
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                lastMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };
                setActiveRightTab('gemini');
              }}
              className={`tab-btn gemini-tab-btn ${activeRightTab === 'gemini' ? 'active' : ''}`}
              data-tooltip="Workspace Copilot AI Assistant"
              data-testid="gemini-tab-btn"
              data-tab="gemini"
            >
              <AiIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              <span>AI Assistant</span>
            </button>
            <button
              onClick={() => setActiveRightTab('translate')}
              className={`tab-btn translate-tab-btn ${activeRightTab === 'translate' ? 'active' : ''}`}
              data-tooltip="AI Audio/Video Translation Panel"
              data-testid="translate-tab-btn"
              data-tab="translate"
              style={{ position: 'relative' }}
            >
              <VoiceIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              <span>Translation</span>
              {translationMessages.length > 0 && (
                <span className="tab-badge">{translationMessages.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeRightTab === 'chat' ? (
            <>
              <div
                ref={chatContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {chatMessages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--affine-text-secondary-color)',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      marginTop: '20px',
                      padding: '16px',
                      background: 'var(--affine-background-primary-color)',
                      borderRadius: '8px',
                      border: '1px solid var(--affine-border-color)',
                    }}
                  >
                    Welcome to <strong>INTOAI | Canvas-LAB</strong> interactive meeting. Ask questions or interact with attendees here.
                  </div>
                ) : (
                  chatMessages.map(msg => {
                    const isMe = msg.sessionId === sessionId;

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            fontSize: '11px',
                            color: 'var(--affine-text-secondary-color)',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            {(() => {
                              if (isMe) return 'You';
                              const msgMember = members.find(
                                m => m.sessionId === msg.sessionId
                              );
                              if (msgMember?.isHost) {
                                return msgMember.name === 'Host'
                                  ? 'Host'
                                  : `Host (${msgMember.name})`;
                              }
                              return msg.name;
                            })()}
                          </span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isHost &&
                            !isMe &&
                            room?.permissions?.privateChat &&
                            !msg.replyToSessionId && (
                              <button
                                onClick={() =>
                                  setReplyingTo({
                                    sessionId: msg.sessionId,
                                    name: msg.name,
                                  })
                                }
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  color: 'var(--affine-brand-color, #1e96eb)',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  marginLeft: '8px',
                                }}
                              >
                                Reply Privately
                              </button>
                            )}
                        </div>
                        <div
                          className={`present-bubble ${isMe ? 'user' : 'guest'}`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {replyingTo && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 12px',
                    background: 'var(--affine-hover-color)',
                    borderTop: '1px solid var(--affine-border-color)',
                    fontSize: '12px',
                    color: 'var(--affine-text-secondary-color)',
                    flexShrink: 0,
                  }}
                >
                  <span>
                    Replying privately to <strong>{replyingTo.name}</strong>
                  </span>
                  <button
                    onClick={() => setReplyingTo(null)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--affine-text-secondary-color)',
                      padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="chat-input-bar">
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder={
                    room?.permissions?.privateChat && !isHost
                      ? 'Type private message to host...'
                      : replyingTo
                        ? `Type private reply to ${replyingTo.name}...`
                        : 'Type message...'
                  }
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSendChat();
                      scrollToChatBottom();
                    }
                  }}
                  className="chat-input-field"
                />
                <button
                  onClick={() => {
                    handleSendChat();
                    scrollToChatBottom();
                  }}
                  className="chat-send-btn"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send
                </button>
              </div>
            </>
          ) : activeRightTab === 'gemini' ? (
            <>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <EditorChatPanel ref={chatPanelRef} editor={editor} />
              </div>
            </>
          ) : (
            /* Translation Tab Content */
            <div className="translate-container" ref={translateContainerRef}>
              <div className="translate-card">
                <div className="translate-title">
                  <span>Target Translation Language</span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      color: 'var(--affine-brand-color, #0f62fe)',
                      fontWeight: 600,
                      background: 'rgba(15, 98, 254, 0.08)',
                      padding: '2px 6px',
                      borderRadius: '8px',
                    }}
                  >
                    STT
                  </span>
                </div>
                <select
                  value={selectedLanguage}
                  onChange={e => handleLanguageChange(e.target.value)}
                  className="translate-select"
                >
                  {AGORA_TRANSLATION_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isTranslationActive ? (
                /* Disabled by Host State */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '28px 16px',
                    textAlign: 'center',
                    background: 'var(--affine-background-primary-color)',
                    border: '1px solid var(--affine-border-color)',
                    borderRadius: '10px',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: 'var(--affine-error-color, #ef4444)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                    }}
                  >
                    Disabled by host
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--affine-text-secondary-color)',
                      lineHeight: 1.45,
                    }}
                  >
                    Live meeting translation is currently disabled for this room.
                  </span>
                  {isHost && (
                    <button
                      onClick={() => {
                        if (onToggleTranslation) {
                          onToggleTranslation(true);
                        } else if (wsService && room?.id) {
                          wsService.updateMediaPermissions(room.id, sessionId, {
                            ...mediaPerms,
                            allowTranslation: true,
                            allowGuestTranslation: true,
                          });
                        }
                      }}
                      style={{
                        marginTop: '6px',
                        padding: '7px 14px',
                        background: 'var(--affine-brand-color, #0f62fe)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(15, 98, 254, 0.25)',
                      }}
                    >
                      Enable Live Translation
                    </button>
                  )}
                </div>
              ) : (
                /* Active Translation Stream */
                <>
                  {/* Live Status Capsule */}
                  <div className="translate-status-badge">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="translate-pulse-dot" />
                      <span>{isTranscribing ? 'Listening & Transcribing...' : 'Agora Speech-to-Text Active'}</span>
                    </div>
                    {translationMessages.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={handleDownloadTranscript}
                          className="translate-toolbar-btn"
                          title="Export Transcript (.txt)"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Export
                        </button>
                        {isHost && (
                          <button
                            onClick={() => {
                              if (wsService && room?.id) {
                                wsService.clearTranslations(room.id, sessionId);
                              }
                            }}
                            className="translate-toolbar-btn"
                            title="Clear Translation Stream"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Search Filter if Messages exist */}
                  {translationMessages.length > 3 && (
                    <input
                      type="text"
                      placeholder="Search spoken speech..."
                      value={translationSearch}
                      onChange={e => setTranslationSearch(e.target.value)}
                      style={{
                        height: '30px',
                        background: 'var(--affine-background-secondary-color, #f4f6f8)',
                        border: '1px solid var(--affine-border-color, #e0e6ed)',
                        borderRadius: '6px',
                        padding: '0 8px',
                        fontSize: '11.5px',
                        color: 'var(--affine-text-primary-color)',
                        outline: 'none',
                      }}
                    />
                  )}

                  {/* Speech & Translation Message Stream */}
                  {translationMessages.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '36px 16px',
                        textAlign: 'center',
                        color: 'var(--affine-text-secondary-color)',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(15, 98, 254, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--affine-brand-color, #0f62fe)',
                        }}
                      >
                        <VoiceIcon style={{ width: '20px', height: '20px' }} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--affine-text-primary-color)' }}>
                        Speak to see live translation
                      </div>
                      <div style={{ fontSize: '11.5px', maxWidth: '240px', lineHeight: 1.45 }}>
                        When meeting participants speak into their microphone, Agora audio is transcribed and translated live into your chosen language.
                      </div>
                    </div>
                  ) : (
                    <div className="translate-stream-list">
                      {translationMessages
                        .filter(msg =>
                          !translationSearch.trim() ||
                          msg.originalText.toLowerCase().includes(translationSearch.toLowerCase()) ||
                          (translationsCache[msg.id]?.[selectedLanguage] || '').toLowerCase().includes(translationSearch.toLowerCase())
                        )
                        .map(msg => {
                          const translated =
                            msg.translations?.[selectedLanguage] ||
                            translationsCache[msg.id]?.[selectedLanguage] ||
                            (msg.originalLanguage === selectedLanguage ? msg.originalText : null);
                          const isTranslating = translatingIds.has(`${msg.id}_${selectedLanguage}`);

                          return (
                            <div key={msg.id} className="translate-msg-card">
                              <div className="translate-msg-header">
                                <div className="translate-msg-speaker">
                                  <div className="translate-avatar-circle">
                                    {msg.speakerName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="translate-speaker-name">{msg.speakerName}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="translate-time">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                  <button
                                    onClick={() => handleCopyTranslation(msg.id, translated || msg.originalText)}
                                    className="translate-toolbar-btn"
                                    style={{ padding: '2px 5px', fontSize: '10px' }}
                                    title="Copy Translation"
                                  >
                                    {copiedId === msg.id ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>

                              {/* Spoken original */}
                              <div className="translate-original-text">
                                <span style={{ fontWeight: 600, marginRight: '4px', opacity: 0.7 }}>Original:</span>
                                {msg.originalText}
                              </div>

                              {/* Translated text */}
                              <div className="translate-translated-text">
                                {isTranslating ? (
                                  <span style={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.6 }}>
                                    Translating...
                                  </span>
                                ) : (
                                  translated || msg.originalText
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
    </aside>
  );
};

