// packages/frontend/core/src/blocksuite/ai/hooks/useChatPanelConfig.ts
import { AINetworkSearchService } from '@affine/core/modules/ai-button/services/network-search';
import { CollectionService } from '@affine/core/modules/collection';
import { DocsService } from '@affine/core/modules/doc';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { DocsSearchService } from '@affine/core/modules/docs-search';
import {
  type SearchCollectionMenuAction,
  type SearchDocMenuAction,
  SearchMenuService,
  type SearchTagMenuAction,
} from '@affine/core/modules/search-menu/services';
import { TagService } from '@affine/core/modules/tag';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { createSignalFromObservable } from '@blocksuite/affine/shared/utils';
import { useFramework } from '@toeverything/infra';

import { useEffect } from 'react';
import { signal } from '@preact/signals-core';

export function useAIChatConfig() {
  const framework = useFramework();

  const safeGet = <T>(service: any): T | null => {
    try {
      return (framework.getOptional(service) as T) ?? null;
    } catch {
      return null;
    }
  };

  const searchService = safeGet<AINetworkSearchService>(AINetworkSearchService);
  const docDisplayMetaService = safeGet<DocDisplayMetaService>(DocDisplayMetaService);
  const workspaceService = safeGet<WorkspaceService>(WorkspaceService);
  const searchMenuService = safeGet<SearchMenuService>(SearchMenuService);
  const docsSearchService = safeGet<DocsSearchService>(DocsSearchService);
  const tagService = safeGet<TagService>(TagService);
  const collectionService = safeGet<CollectionService>(CollectionService);
  const docsService = safeGet<DocsService>(DocsService);

  const networkSearchEnabledSignal = signal(false);
  const networkSearchVisibleSignal = signal(true);

  useEffect(() => {
    let unmounted = false;
    fetch('/api/copilot/search-grounding-status')
      .then(res => res.json())
      .then(data => {
        if (!unmounted && typeof data?.supported === 'boolean') {
          networkSearchVisibleSignal.value = data.supported;
          if (!data.supported) {
            networkSearchEnabledSignal.value = false;
          }
        }
      })
      .catch(() => {});
    return () => {
      unmounted = true;
    };
  }, []);

  const networkSearchConfig = {
    visible: networkSearchVisibleSignal,
    enabled: networkSearchEnabledSignal,
    setEnabled: (enabled: boolean) => {
      try {
        searchService?.setEnabled(enabled);
      } catch (_) {}
      networkSearchEnabledSignal.value = enabled;
    },
  };

  const docDisplayConfig = {
    getIcon: (docId: string) => {
      return docDisplayMetaService ? docDisplayMetaService.icon$(docId, { type: 'lit' }).value : null;
    },
    getTitle: (docId: string) => {
      return docDisplayMetaService ? docDisplayMetaService.title$(docId).value : 'Untitled';
    },
    getTitleSignal: (docId: string) => {
      if (!docDisplayMetaService) return { signal: signal('Untitled'), cleanup: () => {} };
      const title$ = docDisplayMetaService.title$(docId);
      return createSignalFromObservable(title$, 'Untitled');
    },
    getDocMeta: (docId: string) => {
      const docRecord = docsService?.list.doc$(docId).value;
      return docRecord?.meta$.value ?? null;
    },
    getDocPrimaryMode: (docId: string) => {
      const docRecord = docsService?.list.doc$(docId).value;
      return docRecord?.primaryMode$.value ?? 'page';
    },
    getDoc: (docId: string) => {
      const doc = workspaceService?.workspace.docCollection.getDoc(docId);
      return doc?.getStore() ?? null;
    },
    getReferenceDocs: (docIds: string[]) => {
      if (!docsSearchService) return { signal: signal([]), cleanup: () => {} };
      const docs$ = docsSearchService.watchRefsFrom(docIds);
      return createSignalFromObservable(docs$, []);
    },
    getTags: () => {
      if (!tagService) return { signal: signal([]), cleanup: () => {} };
      const tagMetas$ = tagService.tagList.tagMetas$;
      return createSignalFromObservable(tagMetas$, []);
    },
    getTagTitle: (tagId: string) => {
      if (!tagService) return '';
      const tag$ = tagService.tagList.tagByTagId$(tagId);
      return tag$?.value?.value$.value ?? '';
    },
    getTagPageIds: (tagId: string) => {
      if (!tagService) return [];
      const tag$ = tagService.tagList.tagByTagId$(tagId);
      if (!tag$) return [];
      return tag$.value?.pageIds$.value ?? [];
    },
    getCollections: () => {
      if (!collectionService) return { signal: signal([]), cleanup: () => {} };
      const collections$ = collectionService.collections$;
      return createSignalFromObservable(collections$, []);
    },
    getCollectionPageIds: (collectionId: string) => {
      if (!collectionService) return [];
      const collection$ = collectionService.collection$(collectionId);
      return collection$?.value?.allowList ?? [];
    },
  };

  const searchMenuConfig = {
    getDocMenuGroup: (
      query: string,
      action: SearchDocMenuAction,
      abortSignal: AbortSignal
    ) => {
      return searchMenuService ? searchMenuService.getDocMenuGroup(query, action, abortSignal) : (Promise.resolve({ items: [] }) as any);
    },
    getTagMenuGroup: (
      query: string,
      action: SearchTagMenuAction,
      abortSignal: AbortSignal
    ) => {
      return searchMenuService ? searchMenuService.getTagMenuGroup(query, action, abortSignal) : (Promise.resolve({ items: [] }) as any);
    },
    getCollectionMenuGroup: (
      query: string,
      action: SearchCollectionMenuAction,
      abortSignal: AbortSignal
    ) => {
      return searchMenuService ? searchMenuService.getCollectionMenuGroup(
        query,
        action,
        abortSignal
      ) : (Promise.resolve({ items: [] }) as any);
    },
  };

  return {
    networkSearchConfig,
    docDisplayConfig,
    searchMenuConfig,
  };
}
