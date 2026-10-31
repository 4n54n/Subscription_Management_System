import type { DocMeta, Workspace } from '@blocksuite/affine/store';
import type { Atom } from 'jotai';
import { atom, useAtomValue } from 'jotai';

const weakMap = new WeakMap<Workspace, Atom<DocMeta[]>>();

// this hook is extracted from './use-block-suite-page-meta.ts' to avoid circular dependency
export function useAllBlockSuiteDocMeta(docCollection: Workspace): DocMeta[] {
  if (!weakMap.has(docCollection)) {
    const getFiltered = () => docCollection.meta.docMetas.filter(m => !m.id.startsWith('temp-'));
    const baseAtom = atom<DocMeta[]>(getFiltered());
    weakMap.set(docCollection, baseAtom);
    baseAtom.onMount = set => {
      set(getFiltered());
      const dispose = docCollection.slots.docListUpdated.subscribe(() => {
        set(getFiltered());
      });
      return () => {
        dispose.unsubscribe();
      };
    };
  }
  return useAtomValue(weakMap.get(docCollection) as Atom<DocMeta[]>);
}
