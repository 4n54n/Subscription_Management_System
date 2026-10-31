import type {
  Collection,
  DeleteCollectionInfo,
  DeletedCollection,
} from '@affine/env/filter';
import { notify } from '@affine/component';
import { LiveData, Service } from '@toeverything/infra';
import { Observable } from 'rxjs';
import { Array as YArray } from 'yjs';

import type { WorkspaceService } from '../../workspace';

const SETTING_KEY = 'setting';

const COLLECTIONS_KEY = 'collections';
const COLLECTIONS_TRASH_KEY = 'collections_trash';

export class CollectionService extends Service {
  constructor(private readonly workspaceService: WorkspaceService) {
    super();
  }

  private get doc() {
    return this.workspaceService.workspace.docCollection.doc;
  }

  private get setting() {
    return this.workspaceService.workspace.docCollection.doc.getMap(
      SETTING_KEY
    );
  }

  private get collectionsYArray(): YArray<Collection> | undefined {
    return this.setting.get(COLLECTIONS_KEY) as YArray<Collection>;
  }

  private get collectionsTrashYArray(): YArray<DeletedCollection> | undefined {
    return this.setting.get(COLLECTIONS_TRASH_KEY) as YArray<DeletedCollection>;
  }

  readonly collections$ = LiveData.from(
    new Observable<Collection[]>(subscriber => {
      subscriber.next(this.collectionsYArray?.toArray() ?? []);
      const fn = () => {
        subscriber.next(this.collectionsYArray?.toArray() ?? []);
      };
      this.setting.observeDeep(fn);
      return () => {
        this.setting.unobserveDeep(fn);
      };
    }),
    []
  );

  collection$(id: string) {
    return this.collections$.map(collections => {
      return collections.find(v => v.id === id);
    });
  }

  readonly collectionsTrash$ = LiveData.from(
    new Observable<DeletedCollection[]>(subscriber => {
      subscriber.next(this.collectionsTrashYArray?.toArray() ?? []);
      const fn = () => {
        subscriber.next(this.collectionsTrashYArray?.toArray() ?? []);
      };
      this.setting.observeDeep(fn);
      return () => {
        this.setting.unobserveDeep(fn);
      };
    }),
    []
  );

  addCollection(...collections: Collection[]) {
    if (!this.setting.has(COLLECTIONS_KEY)) {
      this.setting.set(COLLECTIONS_KEY, new YArray());
    }
    this.doc.transact(() => {
      this.collectionsYArray?.insert(0, collections);
    });
  }

  updateCollection(id: string, updater: (value: Collection) => Collection) {
    if (this.collectionsYArray) {
      updateFirstOfYArray(
        this.collectionsYArray,
        v => v.id === id,
        v => {
          return updater(v);
        }
      );
    }
  }

  addPageToCollection(collectionId: string, pageId: string) {
    this.updateCollection(collectionId, old => {
      return {
        ...old,
        allowList: [pageId, ...(old.allowList ?? [])],
      };
    });
  }

  deletePageFromCollection(collectionId: string, pageId: string) {
    this.updateCollection(collectionId, old => {
      return {
        ...old,
        allowList: old.allowList?.filter(id => id !== pageId),
      };
    });
  }

  async deleteCollection(info: DeleteCollectionInfo, ...ids: string[]) {
    const collectionsYArray = this.collectionsYArray;
    if (!collectionsYArray) {
      return;
    }

    const workspaceId = this.workspaceService.workspace.id;
    let projects: any[] = [];
    if (workspaceId && typeof window !== 'undefined') {
      try {
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query getProjectsForDeletionCheck($workspaceId: String!) {
                projects(workspaceId: $workspaceId) {
                  id
                  name
                  category
                }
              }
            `,
            variables: { workspaceId },
          }),
        });
        const json = await res.json();
        projects = json?.data?.projects || [];
      } catch (e) {
        console.error('Failed to fetch projects for domain deletion guard:', e);
      }
    }

    const validIdsToDelete: string[] = [];

    for (const id of ids) {
      const collection = this.collections$.value.find(c => c.id === id);
      if (!collection) continue;

      // 1. Check document presence under the domain
      const docCount = collection.allowList?.length ?? 0;
      if (docCount > 0) {
        const msg = `Cannot delete research domain "${collection.name}". It currently contains ${docCount} research document(s). Please remove or reassign the documents first.`;
        notify.error({ title: 'Domain Cannot Be Deleted', message: msg });
        continue;
      }

      // 2. Check project category assignment
      const linkedProject = projects.find(
        (p: any) => p.category === collection.name || p.category === collection.id
      );
      if (linkedProject) {
        const msg = `Cannot delete research domain "${collection.name}". It is currently assigned as the category for project "${linkedProject.name}". Please reassign the project category first.`;
        notify.error({ title: 'Domain In Use', message: msg });
        continue;
      }

      validIdsToDelete.push(id);
    }

    if (validIdsToDelete.length === 0) {
      return;
    }

    const set = new Set(validIdsToDelete);
    this.workspaceService.workspace.docCollection.doc.transact(() => {
      const indexList: number[] = [];
      const list: Collection[] = [];
      collectionsYArray.forEach((collection, i) => {
        if (set.has(collection.id)) {
          set.delete(collection.id);
          indexList.unshift(i);
          list.push(JSON.parse(JSON.stringify(collection)));
        }
      });
      indexList.forEach(i => {
        collectionsYArray.delete(i);
      });
      if (!this.collectionsTrashYArray) {
        this.setting.set(COLLECTIONS_TRASH_KEY, new YArray());
      }
      const collectionsTrashYArray = this.collectionsTrashYArray;
      if (!collectionsTrashYArray) {
        return;
      }
      collectionsTrashYArray.insert(
        0,
        list.map(collection => ({
          userId: info?.userId,
          userName: info ? info.userName : 'Local User',
          collection,
        }))
      );
      if (collectionsTrashYArray.length > 10) {
        collectionsTrashYArray.delete(10, collectionsTrashYArray.length - 10);
      }
    });
  }

  private deletePagesFromCollection(
    collection: Collection,
    idSet: Set<string>
  ) {
    const newAllowList = collection.allowList.filter(id => !idSet.has(id));
    if (newAllowList.length !== collection.allowList.length) {
      this.updateCollection(collection.id, old => {
        return {
          ...old,
          allowList: newAllowList,
        };
      });
    }
  }

  deletePagesFromCollections(ids: string[]) {
    const idSet = new Set(ids);
    this.doc.transact(() => {
      this.collections$.value.forEach(collection => {
        this.deletePagesFromCollection(collection, idSet);
      });
    });
  }
}

const updateFirstOfYArray = <T>(
  array: YArray<T>,
  p: (value: T) => boolean,
  update: (value: T) => T
) => {
  array.doc?.transact(() => {
    for (let i = 0; i < array.length; i++) {
      const ele = array.get(i);
      if (p(ele)) {
        array.delete(i);
        array.insert(i, [update(ele)]);
        return;
      }
    }
  });
};
