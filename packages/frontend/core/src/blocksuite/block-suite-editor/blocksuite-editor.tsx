import { EditorLoading } from '@affine/component/page-detail-skeleton';
import type {
  EdgelessEditor,
  PageEditor,
} from '@affine/core/blocksuite/editors';
import { ServerService } from '@affine/core/modules/cloud';
import {
  EditorSettingService,
  fontStyleOptions,
} from '@affine/core/modules/editor-setting';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import track from '@affine/track';
import {
  customImageProxyMiddleware,
  ImageProxyService,
} from '@blocksuite/affine/blocks/image';
import { appendParagraphCommand } from '@blocksuite/affine/blocks/paragraph';
import type { DocTitle } from '@blocksuite/affine/fragments/doc-title';
import { DisposableGroup } from '@blocksuite/affine/global/disposable';
import type { DocMode, RootBlockModel } from '@blocksuite/affine/model';
import { focusBlockEnd } from '@blocksuite/affine/shared/commands';
import { LinkPreviewerService } from '@blocksuite/affine/shared/services';
import { getLastNoteBlock } from '@blocksuite/affine/shared/utils';
import type { BlockStdScope, EditorHost } from '@blocksuite/affine/std';
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx';
import type { Store } from '@blocksuite/affine/store';
import { Slot } from '@radix-ui/react-slot';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import clsx from 'clsx';
import type { CSSProperties, HTMLAttributes } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DefaultOpenProperty } from '../../components/doc-properties';
import { BlocksuiteDocEditor, BlocksuiteEdgelessEditor } from './lit-adaper';
import * as styles from './styles.css';

export interface AffineEditorContainer extends HTMLElement {
  page: Store;
  doc: Store;
  docTitle: DocTitle;
  host?: EditorHost;
  model: RootBlockModel | null;
  updateComplete: Promise<boolean>;
  mode: DocMode;
  origin: HTMLDivElement;
  std: BlockStdScope;
}

export interface EditorProps extends HTMLAttributes<HTMLDivElement> {
  page: Store;
  mode: DocMode;
  shared?: boolean;
  readonly?: boolean;
  defaultOpenProperty?: DefaultOpenProperty;
  // on Editor ready
  onEditorReady?: (editor: AffineEditorContainer) => (() => void) | void;
}

// Custom Mindmap Resize Handle Overlay for Edgeless canvas
const MindmapResizeOverlay = ({
  editor,
}: {
  editor: AffineEditorContainer;
}) => {
  const [mindmapState, setMindmapState] = useState<{
    mindmap: any;
    screenBound: { x: number; y: number; w: number; h: number };
  } | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const checkSelection = () => {
      const host = editor.host;
      if (!host) {
        setMindmapState(null);
        animationFrameId = requestAnimationFrame(checkSelection);
        return;
      }

      let gfx: any = null;
      try {
        gfx = host.std.get(GfxControllerIdentifier);
      } catch {
        setMindmapState(null);
        animationFrameId = requestAnimationFrame(checkSelection);
        return;
      }

      if (!gfx || !gfx.selection) {
        setMindmapState(null);
        animationFrameId = requestAnimationFrame(checkSelection);
        return;
      }

      const selectedEls = gfx.selection.selectedElements;
      if (!selectedEls || selectedEls.length === 0) {
        setMindmapState(null);
        animationFrameId = requestAnimationFrame(checkSelection);
        return;
      }

      let mindmap: any = null;
      for (const el of selectedEls) {
        if (
          el.type === 'mindmap' ||
          el.constructor?.name === 'MindmapElementModel'
        ) {
          mindmap = el;
          break;
        }
        if (
          el.group &&
          (el.group.type === 'mindmap' ||
            el.group.constructor?.name === 'MindmapElementModel')
        ) {
          mindmap = el.group;
          break;
        }
      }

      if (!mindmap) {
        setMindmapState(null);
        animationFrameId = requestAnimationFrame(checkSelection);
        return;
      }

      const bound =
        mindmap.elementBound || mindmap.tree?.element?.elementBound;
      if (!bound || !gfx.viewport?.toViewCoord) {
        setMindmapState(null);
        animationFrameId = requestAnimationFrame(checkSelection);
        return;
      }

      const [topLeftX, topLeftY] = gfx.viewport.toViewCoord([bound.x, bound.y]);
      const [bottomRightX, bottomRightY] = gfx.viewport.toViewCoord([
        bound.x + bound.w,
        bound.y + bound.h,
      ]);

      const containerBox = editor.origin?.getBoundingClientRect() || {
        left: 0,
        top: 0,
      };
      const relativeX = topLeftX - containerBox.left;
      const relativeY = topLeftY - containerBox.top;
      const width = bottomRightX - topLeftX;
      const height = bottomRightY - topLeftY;

      setMindmapState({
        mindmap,
        screenBound: { x: relativeX, y: relativeY, w: width, h: height },
      });

      animationFrameId = requestAnimationFrame(checkSelection);
    };

    animationFrameId = requestAnimationFrame(checkSelection);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [editor]);

  if (!mindmapState) return null;

  const { mindmap, screenBound } = mindmapState;

  const handlePointerDown = (
    corner: 'tl' | 'tr' | 'bl' | 'br',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialBound = { ...screenBound };

    const initialNodesMap = new Map<
      any,
      { x: number; y: number; w: number; h: number; fontSize: number }
    >();
    if (mindmap.childElements) {
      mindmap.childElements.forEach((childEl: any) => {
        let x = 0,
          y = 0,
          w = 100,
          h = 30;
        if (typeof childEl.xywh === 'string') {
          try {
            const parsed = JSON.parse(childEl.xywh);
            x = parsed[0];
            y = parsed[1];
            w = parsed[2];
            h = parsed[3];
          } catch (_) {}
        } else if (childEl.elementBound) {
          x = childEl.elementBound.x;
          y = childEl.elementBound.y;
          w = childEl.elementBound.w;
          h = childEl.elementBound.h;
        }
        initialNodesMap.set(childEl, {
          x,
          y,
          w,
          h,
          fontSize: childEl.fontSize || 14,
        });
      });
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;

      let newW = initialBound.w;
      if (corner === 'tr' || corner === 'br') newW += deltaX;
      else if (corner === 'tl' || corner === 'bl') newW -= deltaX;

      const scale = Math.max(0.25, Math.min(5.0, newW / initialBound.w));

      try {
        const doc = mindmap.surface?.doc || editor.page;
        if (doc) {
          const modelBound = mindmap.elementBound;
          const minX = modelBound.x;
          const minY = modelBound.y;

          doc.transact(() => {
            initialNodesMap.forEach((initialData, childEl) => {
              const scaledX = Math.round(minX + (initialData.x - minX) * scale);
              const scaledY = Math.round(minY + (initialData.y - minY) * scale);
              const scaledW = Math.max(20, Math.round(initialData.w * scale));
              const scaledH = Math.max(10, Math.round(initialData.h * scale));

              childEl.xywh = `[${scaledX},${scaledY},${scaledW},${scaledH}]`;
              childEl.fontSize = Math.max(
                8,
                Math.round(initialData.fontSize * scale)
              );
            });
          });
        }
        if (typeof mindmap.layout === 'function') {
          mindmap.layout();
        }
      } catch (err) {
        console.error('[MindmapResizeOverlay]', err);
      }
    };

    const onPointerUp = () => {
      if (typeof mindmap.layout === 'function') {
        mindmap.layout();
      }
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '14px',
    height: '14px',
    background: '#ffffff',
    border: '2.5px solid #1e88e5',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 99999,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenBound.x}px`,
        top: `${screenBound.y}px`,
        width: `${screenBound.w}px`,
        height: `${screenBound.h}px`,
        border: '2px dashed #1e88e5',
        pointerEvents: 'none',
        zIndex: 99998,
        boxSizing: 'border-box',
        borderRadius: '4px',
      }}
    >
      <div
        style={{ ...handleStyle, left: '0%', top: '0%', cursor: 'nwse-resize' }}
        onPointerDown={e => handlePointerDown('tl', e)}
      />
      <div
        style={{
          ...handleStyle,
          left: '100%',
          top: '0%',
          cursor: 'nesw-resize',
        }}
        onPointerDown={e => handlePointerDown('tr', e)}
      />
      <div
        style={{
          ...handleStyle,
          left: '0%',
          top: '100%',
          cursor: 'nesw-resize',
        }}
        onPointerDown={e => handlePointerDown('bl', e)}
      />
      <div
        style={{
          ...handleStyle,
          left: '100%',
          top: '100%',
          cursor: 'nwse-resize',
        }}
        onPointerDown={e => handlePointerDown('br', e)}
      />
    </div>
  );
};

const BlockSuiteEditorImpl = ({
  mode,
  page,
  className,
  shared,
  readonly,
  style,
  onEditorReady,
  defaultOpenProperty,
  ...props
}: EditorProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PageEditor>(null);
  const docTitleRef = useRef<DocTitle>(null);
  const edgelessRef = useRef<EdgelessEditor>(null);
  const featureFlags = useService(FeatureFlagService).flags;
  const enableEditorRTL = useLiveData(featureFlags.enable_editor_rtl.$);
  const editorSetting = useService(EditorSettingService).editorSetting;
  const server = useService(ServerService).server;

  const { enableMiddleClickPaste } = useLiveData(
    editorSetting.settings$.selector(s => ({
      enableMiddleClickPaste: s.enableMiddleClickPaste,
    }))
  );

  /**
   * mimic an AffineEditorContainer using proxy
   */
  const affineEditorContainerProxy = useMemo(() => {
    const api = {
      get page() {
        return page;
      },
      get doc() {
        return page;
      },
      get docTitle() {
        return docTitleRef.current;
      },
      get host() {
        return (
          (mode === 'page'
            ? docRef.current?.host
            : edgelessRef.current?.host) ?? null
        );
      },
      get model() {
        return page.root as any;
      },
      get updateComplete() {
        return mode === 'page'
          ? docRef.current?.updateComplete
          : edgelessRef.current?.updateComplete;
      },
      get mode() {
        return mode;
      },
      get origin() {
        return rootRef.current;
      },
      get std() {
        return mode === 'page' ? docRef.current?.std : edgelessRef.current?.std;
      },
    };

    const proxy = new Proxy(api, {
      has(_, prop) {
        return (
          Reflect.has(api, prop) ||
          (rootRef.current ? Reflect.has(rootRef.current, prop) : false)
        );
      },
      get(_, prop) {
        if (Reflect.has(api, prop)) {
          return api[prop as keyof typeof api];
        }
        if (rootRef.current && Reflect.has(rootRef.current, prop)) {
          const maybeFn = Reflect.get(rootRef.current, prop);
          if (typeof maybeFn === 'function') {
            return maybeFn.bind(rootRef.current);
          } else {
            return maybeFn;
          }
        }
        return undefined;
      },
    }) as AffineEditorContainer;

    return proxy;
  }, [mode, page]);

  const handleClickPageModeBlank = useCallback(() => {
    if (shared || readonly || page.readonly) return;
    const std = affineEditorContainerProxy.host?.std;
    if (!std) {
      return;
    }
    const note = getLastNoteBlock(page);
    if (note) {
      const lastBlock = note.lastChild();
      if (
        lastBlock &&
        lastBlock.flavour === 'affine:paragraph' &&
        lastBlock.text?.length === 0
      ) {
        const focusBlock = std.view.getBlock(lastBlock.id) ?? undefined;
        std.command.exec(focusBlockEnd, {
          focusBlock,
          force: true,
        });
        return;
      }
    }

    std.command.exec(appendParagraphCommand);
  }, [affineEditorContainerProxy.host?.std, page, readonly, shared]);

  useEffect(() => {
    const disposable = page.slots.blockUpdated.subscribe(() => {
      disposable.unsubscribe();
      page.workspace.meta.setDocMeta(page.id, {
        updatedDate: Date.now(),
      });
    });
    return () => {
      disposable.unsubscribe();
    };
  }, [page]);

  useEffect(() => {
    const editorContainer = rootRef.current;
    if (editorContainer) {
      const handleMiddleClick = (e: MouseEvent) => {
        if (!enableMiddleClickPaste && e.button === 1) {
          e.preventDefault();
        }
      };
      editorContainer.addEventListener('pointerup', handleMiddleClick, {
        capture: true,
      });
      editorContainer.addEventListener('auxclick', handleMiddleClick, {
        capture: true,
      });
      return () => {
        editorContainer?.removeEventListener('pointerup', handleMiddleClick, {
          capture: true,
        });
        editorContainer?.removeEventListener('auxclick', handleMiddleClick, {
          capture: true,
        });
      };
    }
    return;
  }, [enableMiddleClickPaste]);

  // Enable Mindmap scaling/resizing by dragging selection corner handles on Edgeless canvas
  useEffect(() => {
    let activeMindmap: any = null;
    let initialBound: { x: number; y: number; w: number; h: number } = {
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    };
    let startPointerX = 0;
    let startPointerY = 0;
    let initialNodeMap: Map<
      any,
      { x: number; y: number; w: number; h: number; fontSize: number }
    > = new Map();
    let isResizingMindmap = false;

    const onPointerDown = (e: PointerEvent) => {
      // Piercing Shadow DOM to detect handle interaction
      const eventPath = e.composedPath();
      const isHandle = eventPath.some(node => {
        if (node && node instanceof HTMLElement) {
          const className = String(node.className || '');
          const tagName = String(node.tagName || '').toLowerCase();
          return (
            className.includes('handle') ||
            className.includes('resize') ||
            className.includes('transform') ||
            tagName.includes('handle') ||
            node.hasAttribute('data-handle') ||
            node.hasAttribute('data-resize')
          );
        }
        return false;
      });

      const host = affineEditorContainerProxy.host;
      if (!host) return;
      const std = host.std;
      if (!std) return;

      let gfx: any = null;
      try {
        gfx = std.get(GfxControllerIdentifier);
      } catch {
        return;
      }
      if (!gfx || !gfx.selection) return;

      const selectedEls = gfx.selection.selectedElements;
      if (!selectedEls || selectedEls.length === 0) return;

      let mindmap: any = null;
      for (const el of selectedEls) {
        if (
          el.type === 'mindmap' ||
          el.constructor?.name === 'MindmapElementModel'
        ) {
          mindmap = el;
          break;
        }
        if (
          el.group &&
          (el.group.type === 'mindmap' ||
            el.group.constructor?.name === 'MindmapElementModel')
        ) {
          mindmap = el.group;
          break;
        }
      }

      if (!mindmap) return;

      const bound =
        mindmap.elementBound || mindmap.tree?.element?.elementBound;
      if (bound && (isHandle || selectedEls.length > 0)) {
        isResizingMindmap = true;
        activeMindmap = mindmap;
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        initialBound = {
          x: bound.x || 0,
          y: bound.y || 0,
          w: bound.w || 200,
          h: bound.h || 100,
        };

        initialNodeMap.clear();
        if (mindmap.childElements) {
          mindmap.childElements.forEach((childEl: any) => {
            let x = 0,
              y = 0,
              w = 100,
              h = 30;
            if (typeof childEl.xywh === 'string') {
              try {
                const parsed = JSON.parse(childEl.xywh);
                x = parsed[0];
                y = parsed[1];
                w = parsed[2];
                h = parsed[3];
              } catch (_) {}
            } else if (childEl.elementBound) {
              x = childEl.elementBound.x;
              y = childEl.elementBound.y;
              w = childEl.elementBound.w;
              h = childEl.elementBound.h;
            }
            initialNodeMap.set(childEl, {
              x,
              y,
              w,
              h,
              fontSize: childEl.fontSize || 14,
            });
          });
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isResizingMindmap || !activeMindmap || initialBound.w <= 0) return;

      const deltaX = e.clientX - startPointerX;
      const deltaY = e.clientY - startPointerY;

      const scaleX = (initialBound.w + deltaX) / initialBound.w;
      const scaleY = (initialBound.h + deltaY) / initialBound.h;
      const scale = Math.max(0.2, Math.min(5.0, (scaleX + scaleY) / 2));

      const minX = initialBound.x;
      const minY = initialBound.y;

      try {
        const doc =
          activeMindmap.surface?.doc || affineEditorContainerProxy.page;
        if (doc) {
          doc.transact(() => {
            initialNodeMap.forEach((initialData, childEl) => {
              const newX = Math.round(minX + (initialData.x - minX) * scale);
              const newY = Math.round(minY + (initialData.y - minY) * scale);
              const newW = Math.max(20, Math.round(initialData.w * scale));
              const newH = Math.max(10, Math.round(initialData.h * scale));

              childEl.xywh = `[${newX},${newY},${newW},${newH}]`;
              const newFontSize = Math.max(
                8,
                Math.round(initialData.fontSize * scale)
              );
              childEl.fontSize = newFontSize;
            });
          });
        }
        if (typeof activeMindmap.layout === 'function') {
          activeMindmap.layout();
        }
      } catch (err) {
        console.error('[MindmapResize]', err);
      }
    };

    const onPointerUp = () => {
      if (isResizingMindmap && activeMindmap) {
        if (typeof activeMindmap.layout === 'function') {
          activeMindmap.layout();
        }
      }
      isResizingMindmap = false;
      activeMindmap = null;
    };

    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointermove', onPointerMove, { capture: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, {
        capture: true,
      });
      window.removeEventListener('pointermove', onPointerMove, {
        capture: true,
      });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
    };
  }, [affineEditorContainerProxy]);

  useEffect(() => {
    const editor = affineEditorContainerProxy;
    globalThis.currentEditor = editor;
    const disposableGroup = new DisposableGroup();
    let canceled = false;

    // provide image proxy endpoint to blocksuite
    const imageProxyUrl = new URL(
      BUILD_CONFIG.imageProxyUrl,
      server.baseUrl
    ).toString();

    const linkPreviewUrl = new URL(
      BUILD_CONFIG.linkPreviewUrl,
      server.baseUrl
    ).toString();

    editor.std.clipboard.use(customImageProxyMiddleware(imageProxyUrl));
    page.get(LinkPreviewerService).setEndpoint(linkPreviewUrl);
    page.get(ImageProxyService).setImageProxyURL(imageProxyUrl);

    editor.updateComplete
      .then(() => {
        if (onEditorReady && !canceled) {
          const dispose = onEditorReady(editor);
          if (dispose) {
            disposableGroup.add(dispose);
          }
        }
      })
      .catch(error => {
        console.error('Error updating editor', error);
      });

    return () => {
      canceled = true;
      disposableGroup.dispose();
    };
  }, [affineEditorContainerProxy, onEditorReady, page, server]);

  return (
    <div
      {...props}
      data-testid={`editor-${page.id}`}
      dir={enableEditorRTL ? 'rtl' : 'ltr'}
      className={clsx(
        `editor-wrapper ${mode}-mode`,
        styles.docEditorRoot,
        className
      )}
      style={style}
      data-affine-editor-container
      ref={rootRef}
    >
      {mode === 'page' ? (
        <BlocksuiteDocEditor
          shared={shared}
          page={page}
          ref={docRef}
          readonly={readonly}
          titleRef={docTitleRef}
          onClickBlank={handleClickPageModeBlank}
          defaultOpenProperty={defaultOpenProperty}
        />
      ) : (
        <>
          <BlocksuiteEdgelessEditor
            shared={shared}
            page={page}
            ref={edgelessRef}
          />
          <MindmapResizeOverlay editor={affineEditorContainerProxy} />
        </>
      )}
    </div>
  );
};

export const BlockSuiteEditor = (props: EditorProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [longerLoading, setLongerLoading] = useState(false);
  const [loadStartTime] = useState(Date.now());

  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(
    editorSetting.settings$.selector(s => ({
      fontFamily: s.fontFamily,
      customFontFamily: s.customFontFamily,
      fullWidthLayout: s.fullWidthLayout,
    }))
  );
  const fontFamily = useMemo(() => {
    const fontStyle = fontStyleOptions.find(
      option => option.key === settings.fontFamily
    );
    if (!fontStyle) {
      return cssVar('fontSansFamily');
    }
    const customFontFamily = settings.customFontFamily;

    return customFontFamily && fontStyle.key === 'Custom'
      ? `${customFontFamily}, ${fontStyle.value}`
      : fontStyle.value;
  }, [settings.customFontFamily, settings.fontFamily]);

  useEffect(() => {
    if (props.page.root) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setLongerLoading(true);
    }, 20 * 1000);
    const reportErrorTimer = setTimeout(() => {
      if (isLoading) {
        track.doc.$.$.loadDoc({
          workspaceId: props.page.workspace.id,
          docId: props.page.id,
          // time cost in ms
          time: Date.now() - loadStartTime,
          success: false,
        });
      }
    }, 60 * 1000);
    const disposable = props.page.slots.rootAdded.subscribe(() => {
      disposable.unsubscribe();
      track.doc.$.$.loadDoc({
        workspaceId: props.page.workspace.id,
        docId: props.page.id,
        time: Date.now() - loadStartTime,
        success: true,
      });
      setIsLoading(false);
      setLongerLoading(false);
    });
    return () => {
      disposable.unsubscribe();
      clearTimeout(timer);
      clearTimeout(reportErrorTimer);
    };
  }, [isLoading, loadStartTime, props.page]);

  return (
    <Slot style={{ '--affine-font-family': fontFamily } as CSSProperties}>
      {isLoading ? (
        <EditorLoading longerLoading={longerLoading} />
      ) : (
        <BlockSuiteEditorImpl key={props.page.id} {...props} />
      )}
    </Slot>
  );
};
