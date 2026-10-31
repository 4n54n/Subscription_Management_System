import type { Workspace as WorkspaceInterface } from '@blocksuite/affine/store';
import { Entity, LiveData } from '@toeverything/infra';
import { Observable } from 'rxjs';

import { builtInTemplates as builtInStickersTemplates } from '@affine/templates/stickers';
import { builtInTemplates as builtInEdgelessTemplates } from '@affine/templates/edgeless';

import { WorkspaceImpl } from '../impls/workspace';
import type { WorkspaceOpenOptions } from '../open-options';
import type { WorkspaceScope } from '../scopes/workspace';
import { WorkspaceEngineService } from '../services/engine';
let templateAssetsMap: Record<string, string> | null = null;

function normalizeKey(key: string): string {
  return key
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/=+$/, '');
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || '';
  const isBase64 = header.includes('base64');
  
  if (isBase64) {
    const bstr = atob(data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } else {
    const decodedData = decodeURIComponent(data);
    return new Blob([decodedData], { type: mime });
  }
}

async function getTemplateAssetBlob(key: string): Promise<Blob | null> {
  if (!templateAssetsMap) {
    templateAssetsMap = {};
    const loadAssets = async (manager: any) => {
      try {
        const categories = await manager.categories();
        for (const cat of categories) {
          const list = await manager.list(cat);
          for (const item of list) {
            if (item.assets) {
              for (const [hash, asset] of Object.entries(item.assets)) {
                if (typeof asset === 'string') {
                  const normalized = normalizeKey(hash);
                  templateAssetsMap![normalized] = asset;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load template assets mapping', e);
      }
    };
    await loadAssets(builtInStickersTemplates);
    await loadAssets(builtInEdgelessTemplates);
  }

  const normalizedKey = normalizeKey(key);
  const assetUrl = templateAssetsMap[normalizedKey];
  if (assetUrl) {
    if (assetUrl.startsWith('data:')) {
      try {
        const blob = dataURLtoBlob(assetUrl);
        return blob;
      } catch (e) {
        // Ignored
      }
    } else {
      try {
        const res = await fetch(assetUrl);
        if (res.ok) {
          const blob = await res.blob();
          return blob;
        }
      } catch (e) {
        // Ignored
      }
    }
  }
  return null;
}


export class Workspace extends Entity {
  constructor(public readonly scope: WorkspaceScope) {
    super();
  }

  get openOptions(): WorkspaceOpenOptions {
    return (
      this.scope?.props?.openOptions ||
      ({
        metadata: { id: '', flavour: 'affine-cloud' },
        isSharedMode: false,
      } as any)
    );
  }

  get id(): string {
    return this.openOptions?.metadata?.id || '';
  }

  get meta() {
    return this.openOptions?.metadata || { id: '', flavour: 'affine-cloud' };
  }

  get flavour() {
    return this.meta?.flavour || 'affine-cloud';
  }

  _docCollection: WorkspaceInterface | null = null;

  get docCollection() {
    if (!this._docCollection) {
      this._docCollection = new WorkspaceImpl({
        id: this.openOptions.metadata.id,
        blobSource: {
          get: async key => {
            let record: any = null;
            try {
              record = await this.engine.blob.get(key);
            } catch (e) {
              // Ignored
            }
            if (record) {
              let mime = record.mime;
              if (mime === 'application/octet-stream' && (key.includes('sticker') || record.data.length < 50000)) {
                // If it looks like an SVG, fix the MIME type
                const textHeader = new TextDecoder().decode(record.data.subarray(0, 100));
                if (textHeader.includes('<svg') || textHeader.includes('xmlns')) {
                  mime = 'image/svg+xml';
                }
              }
              return new Blob([record.data], { type: mime });
            }
            return await getTemplateAssetBlob(key);
          },
          delete: async () => {
            return;
          },
          list: async () => {
            return [];
          },
          set: async (id, blob) => {
            await this.engine.blob.set({
              key: id,
              data: new Uint8Array(await blob.arrayBuffer()),
              mime: blob.type,
            });
            return id;
          },
          name: 'blob',
          readonly: false,
        },
        onLoadDoc: doc => this.engine.doc.connectDoc(doc),
        onLoadAwareness: awareness =>
          this.engine.awareness.connectAwareness(awareness),
      });
    }
    return this._docCollection;
  }

  get rootYDoc() {
    return this.docCollection.doc;
  }

  get canGracefulStop() {
    // TODO
    return true;
  }

  get engine() {
    return this.framework.get(WorkspaceEngineService).engine;
  }

  name$ = LiveData.from<string | undefined>(
    new Observable(subscriber => {
      subscriber.next(this.docCollection.meta.name);
      const subscription =
        this.docCollection.meta.commonFieldsUpdated.subscribe(() => {
          subscriber.next(this.docCollection.meta.name);
        });
      return subscription.unsubscribe.bind(subscription);
    }),
    undefined
  );

  avatar$ = LiveData.from<string | undefined>(
    new Observable(subscriber => {
      subscriber.next(this.docCollection.meta.avatar);
      const subscription =
        this.docCollection.meta.commonFieldsUpdated.subscribe(() => {
          subscriber.next(this.docCollection.meta.avatar);
        });
      return subscription.unsubscribe.bind(subscription);
    }),
    undefined
  );

  override dispose(): void {
    this.docCollection.dispose();
  }
}
