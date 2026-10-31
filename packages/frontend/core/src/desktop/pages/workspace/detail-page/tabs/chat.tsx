import { ChatPanel } from '@affine/core/blocksuite/ai';
import type { AffineEditorContainer } from '@affine/core/blocksuite/block-suite-editor';
import { useAIChatConfig } from '@affine/core/components/hooks/affine/use-ai-chat-config';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { RefNodeSlotsProvider } from '@blocksuite/affine/inlines/reference';
import { DocModeProvider } from '@blocksuite/affine/shared/services';
import {
  createSignalFromObservable,
  SpecProvider,
} from '@blocksuite/affine/shared/utils';
import { signal } from '@preact/signals-core';
import { useFramework } from '@toeverything/infra';
import { forwardRef, useEffect, useRef } from 'react';

import * as styles from './chat.css';

export interface SidebarTabProps {
  editor: AffineEditorContainer | null;
  onLoad?: ((component: HTMLElement) => void) | null;
}

// A wrapper for CopilotPanel
export const EditorChatPanel = forwardRef(function EditorChatPanel(
  { editor, onLoad }: SidebarTabProps,
  ref: React.ForwardedRef<ChatPanel>
) {
  const chatPanelRef = useRef<ChatPanel | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const framework = useFramework();

  useEffect(() => {
    if (onLoad && chatPanelRef.current) {
      (chatPanelRef.current as ChatPanel).updateComplete
        .then(() => {
          if (ref) {
            if (typeof ref === 'function') {
              ref(chatPanelRef.current);
            } else {
              ref.current = chatPanelRef.current;
            }
          }
        })
        .catch(console.error);
    }
  }, [onLoad, ref]);

  const { docDisplayConfig, searchMenuConfig, networkSearchConfig } =
    useAIChatConfig();

  useEffect(() => {
    if (!editor) return;

    let timer: any = null;

    const setupPanel = () => {
      if (!editor || !editor.host) return false;

      if (!chatPanelRef.current) {
        chatPanelRef.current = new ChatPanel();
        chatPanelRef.current.host = editor.host;
        chatPanelRef.current.doc = editor.doc;

        const workbench = framework.getOptional(WorkbenchService)?.workbench;
        chatPanelRef.current.appSidebarConfig = {
          getWidth: () => {
            if (workbench) {
              return createSignalFromObservable(workbench.sidebarWidth$, 0) as any;
            }
            return { signal: signal(0), cleanup: () => {} } as any;
          },
          isOpen: () => {
            if (workbench) {
              return createSignalFromObservable(workbench.sidebarOpen$, true) as any;
            }
            return { signal: signal(true), cleanup: () => {} } as any;
          },
        };

        chatPanelRef.current.docDisplayConfig = docDisplayConfig;
        chatPanelRef.current.searchMenuConfig = searchMenuConfig;
        chatPanelRef.current.networkSearchConfig = networkSearchConfig;
        chatPanelRef.current.previewSpecBuilder =
          SpecProvider._.getSpec('preview:page');

        if (containerRef.current && !containerRef.current.contains(chatPanelRef.current)) {
          containerRef.current.append(chatPanelRef.current);
        }
      } else {
        chatPanelRef.current.host = editor.host;
        chatPanelRef.current.doc = editor.doc;
      }

      return true;
    };

    if (!setupPanel()) {
      timer = setInterval(() => {
        if (setupPanel()) {
          clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    docDisplayConfig,
    editor,
    framework,
    networkSearchConfig,
    searchMenuConfig,
  ]);

  return <div className={styles.root} ref={containerRef} />;
});
